/**
 * src/app.js
 *
 * Configures and returns the Express application instance.
 * Separated from server.js so it can be imported in tests without
 * actually binding to a port.
 *
 * Composition root — this is the only place where concrete
 * implementations are wired together (poor-man's DI container).
 */
import express from "express";
import session from "express-session";
import passport from "passport";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";

// Config
import { env } from "./config/env.js";
import logger from "./config/logger.js";
import { configurePassport } from "./config/passport.js";

// Repositories
import { UserRepository } from "./repositories/UserRepository.js";
import { ProjectRepository } from "./repositories/ProjectRepository.js";
import { RepoRepository } from "./repositories/RepoRepository.js";
import { RepoEnvFileRepository } from "./repositories/RepoEnvFileRepository.js";
import { DeployLogRepository } from "./repositories/DeployLogRepository.js";
import { EnvVarRepository } from "./repositories/EnvVarRepository.js";
import { TeamRepository } from "./repositories/TeamRepository.js";
import { DiagramRepository } from "./repositories/DiagramRepository.js";
import { DiagramNodeRepository } from "./repositories/DiagramNodeRepository.js";
import { DiagramEdgeRepository } from "./repositories/DiagramEdgeRepository.js";
import { ProjectHealthcheckRepository } from "./repositories/ProjectHealthcheckRepository.js";

// Services
import { ProjectService } from "./services/ProjectService.js";
import { DeployService } from "./services/DeployService.js";
import { EnvVarService } from "./services/EnvVarService.js";
import { TeamService } from "./services/TeamService.js";
import { DiagramService } from "./services/DiagramService.js";
import { StatusService } from "./services/StatusService.js";

// Queue
import { deployQueue } from "./queues/deployQueue.js";

// Controllers
import { makeProjectController } from "./controllers/projectController.js";
import { makeDeployController } from "./controllers/deployController.js";
import { makeEnvVarController } from "./controllers/envVarController.js";
import { makeTeamController } from "./controllers/teamController.js";
import { makeDiagramController } from "./controllers/diagramController.js";
import { makeStatusController } from "./controllers/statusController.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import { makeProjectRouter } from "./routes/projectRoutes.js";
import { makeJobRouter } from "./routes/jobRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";
import { makeConfigRouter } from "./routes/configRoutes.js";
import { makeEnvVarRouter } from "./routes/envVarRoutes.js";
import { makeTeamRouter } from "./routes/teamRoutes.js";
import { makeDiagramRouter } from "./routes/diagramRoutes.js";
import {
  makeStatusRouter,
  makePublicStatusRouter,
} from "./routes/statusRoutes.js";

// Middlewares
import { correlationId } from "./middlewares/correlationId.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { errorHandler } from "./middlewares/errorHandler.js";

// ── Instantiate repositories ──────────────────────────────────────────────
const userRepo = new UserRepository();
const projectRepo = new ProjectRepository();
const repoRepo = new RepoRepository();
const repoEnvFileRepo = new RepoEnvFileRepository();
const deployLogRepo = new DeployLogRepository();
const envVarRepo = new EnvVarRepository();
const teamRepo = new TeamRepository();
const diagramRepo = new DiagramRepository();
const diagramNodeRepo = new DiagramNodeRepository();
const diagramEdgeRepo = new DiagramEdgeRepository();
const healthcheckRepo = new ProjectHealthcheckRepository();

// ── Configure Passport (inject userRepo) ──────────────────────────────────
configurePassport(userRepo);

// ── Instantiate services ──────────────────────────────────────────────────
const projectService = new ProjectService(
  projectRepo,
  repoRepo,
  repoEnvFileRepo,
);
const deployService = new DeployService(
  projectRepo,
  deployLogRepo,
  deployQueue,
  repoRepo,
  userRepo,
);
const envVarService = new EnvVarService(envVarRepo, repoRepo, projectRepo);
const teamService = new TeamService(teamRepo, userRepo);
const diagramService = new DiagramService(
  diagramRepo,
  diagramNodeRepo,
  diagramEdgeRepo,
  projectRepo,
  teamRepo,
  healthcheckRepo,
);
const statusService = new StatusService(projectRepo, healthcheckRepo);

// ── Instantiate controllers ───────────────────────────────────────────────
const projectCtrl = makeProjectController(projectService);
const deployCtrl = makeDeployController(deployService);
const envVarCtrl = makeEnvVarController(envVarService);
const teamCtrl = makeTeamController(teamService);
const diagramCtrl = makeDiagramController(diagramService);
const statusCtrl = makeStatusController(statusService);

// ── Build Express app ─────────────────────────────────────────────────────
const app = express();

// Trust first proxy (needed when behind nginx/load-balancer for IP logging)
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — restrict to known origins in production ────────────────────────
const allowedOrigins =
  env.NODE_ENV === "production"
    ? (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim())
    : true; // allow all in dev

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Required for session cookies
  }),
);

// ── Compression ───────────────────────────────────────────────────────────
app.use(compression());

// ── Rate limiting ─────────────────────────────────────────────────────────
// keyGenerator extrae la IP real del cliente aunque estemos detrás de
// CapRover (nginx → Docker → app). express-rate-limit por defecto usa
// req.ip, que con trust proxy=1 ya debería ser la IP real, pero si hay
// más capas de proxy lo resolvemos explícitamente desde X-Forwarded-For.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 1000, // 1000 req / 15 min por IP (~1 req/s) — v7: "limit" (antes "max")
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      // El primer IP de la lista es el cliente original
      return ips.split(",")[0].trim();
    }
    return req.socket.remoteAddress ?? "unknown";
  },
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});
app.use("/api/", limiter);

// ── Correlation ID (must be early — logger reads it) ─────────────────────
app.use(correlationId);

// ── Request logging ───────────────────────────────────────────────────────
app.use(requestLogger);

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// ── Session (needed by passport) ─────────────────────────────────────────
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }),
);

// ── Passport ──────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Swagger UI ────────────────────────────────────────────────────────────
// Only served in non-production to avoid exposing the API surface
if (env.NODE_ENV !== "production") {
  const { default: swaggerUi } = await import("swagger-ui-express");
  const { default: YAML } = await import("yamljs");
  const { createRequire } = await import("module");
  const { fileURLToPath } = await import("url");
  const path = await import("path");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const spec = YAML.load(path.join(__dirname, "..", "openapi.yaml"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
  logger.info("Swagger UI available at /api-docs");
}

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
// Public status aggregate (NO auth) — registered before the broad "/api" router
app.use("/api/public-status", makePublicStatusRouter(statusCtrl));
app.use("/api/projects", makeProjectRouter(projectCtrl, deployCtrl));
app.use("/api/projects/:id/repos/:repoId/env", makeEnvVarRouter(envVarCtrl));
app.use("/api/jobs", makeJobRouter(deployCtrl));
app.use("/api/github", githubRoutes);
app.use(
  "/api/config",
  makeConfigRouter(
    projectRepo,
    repoRepo,
    envVarRepo,
    repoEnvFileRepo,
    healthcheckRepo,
  ),
);
app.use("/api/teams", makeTeamRouter(teamCtrl));
app.use("/api/diagrams", makeDiagramRouter(diagramCtrl));
// Per-project healthcheck CRUD + config (authenticated, broad — registered last)
app.use("/api", makeStatusRouter(statusCtrl));

// ── Health check (no auth) ────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", ts: new Date().toISOString() }),
);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) =>
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Route not found" } }),
);

// ── Centralised error handler (must be last) ──────────────────────────────
app.use(errorHandler);

export { deployService, projectRepo };
export default app;
