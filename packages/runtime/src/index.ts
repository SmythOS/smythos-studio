import { Logger, SmythRuntime, SystemEvents, version } from "@smythos/sre";
import compression from "compression";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import express from "express";
import session from "express-session";
import { Server } from "http";
import path from "path";
import url from "url";

// Core imports
import config from "@core/config";
import { modelsConfig } from "@core/config/models.config";
import { startServers } from "@core/management-router";
import cors from "@core/middlewares/cors.mw";
import { errorHandler, notFoundHandler } from "@core/middlewares/error.mw";
import RateLimiter from "@core/middlewares/rateLimiter.mw";
import { uploadHandler } from "@core/middlewares/uploadHandler.mw";
import { requestContext } from "@core/services/request-context";

import { registerComponents } from "@core/component/componentRegistry";
import { registerConnectors } from "@core/connectors/connectorRegistry";

// Routes are handled by configureAgentRouters

// Shared router configuration
import {
  configureAgentRouters,
  createCombinedServerConfig,
} from "@core/router-config";

// Embodiment imports
import { routes as embodimentRoutes } from "@embodiment/routes";

// Code sandbox service
import { CodeSandboxService } from "./services/code-sandbox.service";

const app = express();
const port = config.env.PORT;

// Register all connectors
registerConnectors();

SystemEvents.on("SRE:Initialized", (SRE) => {
  registerComponents();
});

const sre = SmythRuntime.Instance.init({
  Cache: {
    Connector: "RAM",
    Settings: {},
  },
  Account: {
    Connector: "SmythOSSAccount",
    Settings: {
      oAuthAppID: config.env.LOGTO_M2M_APP_ID,
      oAuthAppSecret: config.env.LOGTO_M2M_APP_SECRET,
      oAuthBaseUrl: `${config.env.LOGTO_SERVER}/oidc/token`,
      oAuthResource: config.env.LOGTO_API_RESOURCE,
      oAuthScope: "",
      smythAPIBaseUrl: config.env.MIDDLEWARE_API_BASE_URL + "/_sysapi",
    },
  },
  Vault: {
    Connector: "JSONFileVault",
    Settings: {
      file: "./data/vault.json",
      shared: "development",
    },
  },
  Component: {
    Connector: "LocalComponent",
  },
  ModelsProvider: {
    Connector: "SmythModelsProvider",
    Settings: {
      models: modelsConfig,
    },
  },
  AgentData: {
    Connector: "SmythOSSAgentData",
    Settings: {
      agentStageDomain: config.env.AGENT_DOMAIN || "",
      agentProdDomain: config.env.PROD_AGENT_DOMAIN || "",
      oAuthAppID: config.env.LOGTO_M2M_APP_ID,
      oAuthAppSecret: config.env.LOGTO_M2M_APP_SECRET,
      oAuthBaseUrl: `${config.env.LOGTO_SERVER}/oidc/token`,
      oAuthResource: config.env.LOGTO_API_RESOURCE,
      oAuthScope: "",
      smythAPIBaseUrl: config.env.MIDDLEWARE_API_BASE_URL + "/_sysapi",
    },
  },
  Log: {
    Connector: "ConsoleLog",
    Settings: {},
  },
  Code: {
    Connector: "ECMASandbox",
    Settings: {},
  },
});

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const console = Logger("runtime-server");

// Helper function for session ID generation
function getCurrentFormattedDate() {
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(cors);
app.options("*", cors);

// Serve static files first for optimal performance
app.use(
  "/static",
  [compression()],
  express.static(path.join(__dirname, "../static"))
);

// Request context middleware
app.use((req, res, next) => {
  requestContext.run(() => {
    next();
  }, {});
});

app.use(cookieParser());

// Session middleware for chatbot functionality
app.use(
  session({
    name: "smythos_runtime_session",
    secret: config.env.SESSION_SECRET || "default-session-secret-for-dev",
    cookie: {
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      sameSite: config.env.NODE_ENV === "development" ? "lax" : "none",
      secure: config.env.NODE_ENV !== "development",
    },
    resave: false,
    saveUninitialized: true,
    genid: (req) => {
      if (req.sessionID && req.session) {
        return req.sessionID;
      }
      const domain = req.hostname;
      const isTestDomain = domain.includes(`.${config.env.AGENT_DOMAIN}`);
      const prefix = isTestDomain ? "test-" : "";
      const formattedDate = getCurrentFormattedDate();
      const randomString = crypto.randomBytes(8).toString("hex");
      return `${prefix}${formattedDate}-${randomString}`;
    },
  })
);

app.use(uploadHandler);
app.use(RateLimiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Health endpoint
app.get("/health", (req: any, res) => {
  let agent_domain = config.env.AGENT_DOMAIN;
  if (config.env.AGENT_DOMAIN_PORT)
    agent_domain += `:${config.env.AGENT_DOMAIN_PORT}`;

  res.send({
    message: "Health Check Complete",
    hostname: req.hostname,
    agent_domain,
    success: true,
    node: port?.toString()?.substr(2),
    name: "smythos-runtime-server",
    sre_version: version,
  });
});

// Root endpoint
app.get("/", (req: any, res) => {
  res.send(`SmythOS Runtime Server`);
});

// Configure agent routers using shared implementation
configureAgentRouters(app, createCombinedServerConfig());

app.use("/", embodimentRoutes);

// 404 handler - must come before error handler
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

let server: Server | null = null;
const codeSandboxService = CodeSandboxService.getInstance();

(async () => {
  try {
    console.info("🚀 Starting SmythOS Runtime Services...");
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Start the code sandbox service
    console.info("📦 Starting Code Sandbox Service...");
    await codeSandboxService.start();
    console.info(`✅ Code Sandbox Service running on http://localhost:5055`);

    // Start the main servers (runtime + management)
    console.info("⚡ Starting Main Runtime Services...");
    server = startServers();

    // Log all running services
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.info("🎯 All Services Running:");
    console.info(
      `   • Management Server: http://localhost:${
        config.env.ADMIN_PORT || "5054"
      }`
    );
    console.info(`   • Runtime Server:    http://localhost:${port}`);
    console.info(`   • Code Sandbox:      http://localhost:5055`);
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.info("✨ SmythOS Runtime is ready!");
  } catch (error) {
    console.error("❌ Failed to start services:", error);
  }
})();

process.on("uncaughtException", (err) => {
  console.error("An uncaught error occurred!");
  console.error(err.stack);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.info(`Received ${signal}, shutting down gracefully`);

  try {
    // Stop code sandbox service
    await codeSandboxService.stop();

    // Close HTTP server if it exists
    if (server) {
      server.close(() => {
        console.info("HTTP server closed");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { app };
