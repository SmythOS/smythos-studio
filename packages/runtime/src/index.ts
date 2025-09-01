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

const app = express();
const port = parseInt(process.env.PORT || "5000");

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
      oAuthAppID: process.env.LOGTO_M2M_APP_ID,
      oAuthAppSecret: process.env.LOGTO_M2M_APP_SECRET,
      oAuthBaseUrl: `${process.env.LOGTO_SERVER}/oidc/token`,
      oAuthResource: process.env.LOGTO_API_RESOURCE,
      oAuthScope: "",
      smythAPIBaseUrl: process.env.SMYTH_API_BASE_URL,
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
      oAuthAppID: process.env.LOGTO_M2M_APP_ID,
      oAuthAppSecret: process.env.LOGTO_M2M_APP_SECRET,
      oAuthBaseUrl: `${process.env.LOGTO_SERVER}/oidc/token`,
      oAuthResource: process.env.LOGTO_API_RESOURCE,
      oAuthScope: "",
      smythAPIBaseUrl: process.env.SMYTH_API_BASE_URL,
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
    secret: process.env.SESSION_SECRET || "default-session-secret-for-dev",
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
(async () => {
  try {
    server = startServers();
    console.info(`Server started on port ${port}`);
  } catch (error) {
    console.error(error);
  }
})();

process.on("uncaughtException", (err) => {
  console.error("An uncaught error occurred!");
  console.error(err.stack);
});

export { app };
