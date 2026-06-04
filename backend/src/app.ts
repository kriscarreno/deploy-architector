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

// Services
import { ProjectService } from "./services/ProjectService.js";
import { DeployService } from "./services/DeployService.js";

// Queue
import { deployQueue } from "./queues/deployQueue.js";

// Controllers
import { makeProjectController } from "./controllers/projectController.js";
import { makeDeployController } from "./controllers/deployController.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import { makeProjectRouter } from "./routes/projectRoutes.js";
import { makeJobRouter } from "./routes/jobRoutes.js";

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
);

// ── Instantiate controllers ───────────────────────────────────────────────
const projectCtrl = makeProjectController(projectService);
const deployCtrl = makeDeployController(deployService);

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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
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
app.use("/api/projects", makeProjectRouter(projectCtrl, deployCtrl));
app.use("/api/jobs", makeJobRouter(deployCtrl));

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

export default app;
