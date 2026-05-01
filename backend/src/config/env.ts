/**
 * src/config/env.js
 *
 * Validates and exports all required environment variables using envalid.
 * The app will CRASH at startup with a descriptive message if any required
 * variable is missing or invalid — fail-fast principle.
 */
import { cleanEnv, str, port, num } from "envalid";
import { config } from "dotenv";

// Load .env file before validation
config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "test", "production"],
    default: "development",
  }),
  PORT: port({ default: 3000 }),
  SESSION_SECRET: str({ docs: "Long random string for session signing" }),

  GITHUB_CLIENT_ID: str(),
  GITHUB_CLIENT_SECRET: str(),
  GITHUB_CALLBACK_URL: str(),

  DB_PATH: str({ default: "./data/deploy_orchestrator.db" }),

  REDIS_HOST: str({ default: "127.0.0.1" }),
  REDIS_PORT: num({ default: 6379 }),
  REDIS_PASSWORD: str({ default: "" }),

  LOG_LEVEL: str({
    choices: ["error", "warn", "info", "http", "debug"],
    default: "info",
  }),

  REPOS_BASE_DIR: str({ default: "./data/repos" }),
  FRONTEND_URL: str({ default: "http://localhost:5173" }),
});
