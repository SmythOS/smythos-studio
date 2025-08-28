import url from "url";
import path from "path";
import express from "express";
import { Server } from "http";
import cookieParser from "cookie-parser";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import {
  SmythRuntime,
  Logger,
  version,
  ConnectorService,
  TConnectorService,
  JSONModelsProvider,
} from "@smythos/sre";

// Core imports
import { uploadHandler } from "@core/middlewares/uploadHandler.mw";
import config from "@core/config";
import { startServers } from "@core/management-router";
import { errorHandler, notFoundHandler } from "@core/middlewares/error.mw";
import cors from "@core/middlewares/cors.mw";
import RateLimiter from "@core/middlewares/rateLimiter.mw";
import { requestContext } from "@core/services/request-context";

import { SmythOSSAgentDataConnector } from "@core/connectors/SmythOSSAgentDataConnector.class";
import { SmythOSSVault } from "@core/connectors/SmythOSSVault.class";
import { SmythOSSManagedVault } from "@core/connectors/SmythOSSManagedVault.class";
import { SmythOSSAccount } from "@core/connectors/SmythOSSAccount.class";

// Debugger Imports
import agentRouter from "@debugger/routes/agent/routes";
import modelsRouter from "@debugger/routes/models/router";

// Agent-runner imports
// import agentRouter from "@agent-runner/routes/agent/router";
// import oauthRouter from "@agent-runner/routes/_oauth/router";

// Embodiment imports
// import { routes as embodimentRoutes } from "@embodiment/routes";

const app = express();
const port = parseInt(process.env.PORT || "5000");

ConnectorService.register(
  TConnectorService.AgentData,
  "SmythOSS",
  SmythOSSAgentDataConnector
);
ConnectorService.register(
  TConnectorService.Account,
  "SmythOSSAccount",
  SmythOSSAccount
);
ConnectorService.register(
  TConnectorService.Vault,
  "SmythOSSVault",
  SmythOSSVault
);
ConnectorService.register(
  TConnectorService.ManagedVault,
  "SmythOSSManagedVault",
  SmythOSSManagedVault
);
ConnectorService.register(
  TConnectorService.ModelsProvider,
  "SmythModelsProvider",
  JSONModelsProvider
);

const sre = SmythRuntime.Instance.init({
  Storage: {
    Connector: "S3",
    Settings: {
      bucket: process.env.AWS_S3_BUCKET_NAME || "",
      region: process.env.AWS_S3_REGION || "",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  },
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
    Connector: "SmythOSSVault",
    Settings: {
      oAuthAppID: process.env.LOGTO_M2M_APP_ID,
      oAuthAppSecret: process.env.LOGTO_M2M_APP_SECRET,
      oAuthBaseUrl: `${process.env.LOGTO_SERVER}/oidc/token`,
      oAuthResource: process.env.LOGTO_API_RESOURCE,
      oAuthScope: "",
      vaultAPIBaseUrl: process.env.SMYTH_VAULT_API_BASE_URL,
    },
  },
  ManagedVault: {
    Connector: "SmythOSSManagedVault",
    Id: "oauth",
    Settings: {
      oAuthAppID: process.env.LOGTO_M2M_APP_ID,
      oAuthAppSecret: process.env.LOGTO_M2M_APP_SECRET,
      oAuthBaseUrl: `${process.env.LOGTO_SERVER}/oidc/token`,
      oAuthResource: process.env.LOGTO_API_RESOURCE,
      oAuthScope: "",
      smythAPIBaseUrl: process.env.SMYTH_API_BASE_URL,
      vaultName: "oauth",
    },
  },
  Component: {
    Connector: "LocalComponent",
  },
  ModelsProvider: {
    Connector: "SmythModelsProvider",
    Settings: {
      models: {
        "gpt-5": {
          label: "GPT 5",
          modelId: "gpt-5",
          provider: "OpenAI",
          features: ["text", "tools", "image", "reasoning", "search"],
          tags: ["New", "Personal"],
          tokens: 0,
          completionTokens: 0,
          enabled: false,
          keyOptions: {
            tokens: 400000,
            completionTokens: 128000,
            enabled: true,
          },
          credentials: "vault",
          interface: "responses",
        },
        "gpt-5-mini": {
          label: "GPT 5 mini",
          modelId: "gpt-5-mini",
          provider: "OpenAI",
          features: ["text", "tools", "image", "reasoning", "search"],
          tags: ["New", "Personal"],
          tokens: 0,
          completionTokens: 0,
          enabled: false,
          keyOptions: {
            tokens: 400000,
            completionTokens: 128000,
            enabled: true,
          },
          credentials: "vault",
          interface: "responses",
          default: true,
        },
        "gpt-5-nano": {
          label: "GPT 5 nano",
          modelId: "gpt-5-nano",
          provider: "OpenAI",
          features: ["text", "tools", "image", "reasoning"],
          tags: ["New", "Personal"],
          tokens: 0,
          completionTokens: 0,
          enabled: false,
          keyOptions: {
            tokens: 400000,
            completionTokens: 128000,
            enabled: true,
          },
          credentials: "vault",
          interface: "responses",
        },
        "gpt-5-chat": {
          label: "GPT 5 Chat",
          modelId: "gpt-5-chat-latest",
          provider: "OpenAI",
          features: ["text", "image"],
          tags: ["New", "Personal"],
          tokens: 0,
          completionTokens: 0,
          enabled: false,
          keyOptions: {
            tokens: 400000,
            completionTokens: 128000,
            enabled: true,
          },
          credentials: "vault",
          interface: "responses",
        },
        "claude-opus-4-1": {
          label: "Claude Opus 4.1",
          modelId: "claude-opus-4-1",
          provider: "Anthropic",
          features: ["text", "image", "tools", "reasoning"],
          tags: ["New", "Personal"],
          tokens: 0,
          completionTokens: 0,
          enabled: false,
          keyOptions: {
            tokens: 200000,
            completionTokens: 32000,
            maxReasoningTokens: 32000,
            enabled: true,
          },
          credentials: "vault",
        },
        "gemini-2.5-pro": {
          label: "Gemini 2.5 Pro",
          modelId: "gemini-2.5-pro",
          provider: "GoogleAI",
          features: [
            "text",
            "image",
            "audio",
            "video",
            "document",
            "tools",
            "reasoning",
          ],
          tags: ["Personal"],
          tokens: 0,
          completionTokens: 0,
          enabled: false,
          keyOptions: {
            tokens: 1048576,
            completionTokens: 65536,
            enabled: true,
          },
          credentials: "vault",
        },
        "gemini-2.5-flash": {
          label: "Gemini 2.5 Flash",
          modelId: "gemini-2.5-flash",
          provider: "GoogleAI",
          features: [
            "text",
            "image",
            "audio",
            "video",
            "document",
            "tools",
            "reasoning",
          ],
          tags: ["New", "Personal"],
          tokens: 0,
          completionTokens: 0,
          enabled: false,
          keyOptions: {
            tokens: 1048576,
            completionTokens: 65536,
            enabled: true,
          },
          credentials: "vault",
        },
      },
    },
  },
  AgentData: {
    Connector: "SmythOSS",
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
  // NKV: {
  //   Connector: "Redis",
  //   Settings: {},
  // },
  VectorDB: {
    Connector: "SmythManaged",
    Settings: {
      oAuthAppID: process.env.LOGTO_M2M_APP_ID,
      oAuthAppSecret: process.env.LOGTO_M2M_APP_SECRET,
      oAuthBaseUrl: `${process.env.LOGTO_SERVER}/oidc/token`,
      oAuthResource: process.env.LOGTO_API_RESOURCE,
      oAuthScope: "",
      smythAPIBaseUrl: process.env.SMYTH_API_BASE_URL,
      openaiApiKey: process.env.OPENAI_API_KEY || "",
    },
  },
  Router: {
    Connector: "ExpressRouter",
    Settings: {
      router: app,
      baseUrl: process.env.ROUTER_BASE_URL,
    },
  },
  Log: {
    Connector: "SmythLog",
    Settings: {
      oAuthScope: "",
      oAuthAppID: process.env.LOGTO_M2M_APP_ID,
      oAuthAppSecret: process.env.LOGTO_M2M_APP_SECRET,
      oAuthBaseUrl: `${process.env.LOGTO_SERVER}/oidc/token`,
      oAuthResource: process.env.LOGTO_API_RESOURCE,
      smythAPIBaseUrl: process.env.SMYTH_API_BASE_URL,
    },
  },
  Code: {
    Connector: "AWSLambda",
    Settings: {
      region: process.env.AWS_LAMBDA_REGION,
      accessKeyId: process.env.AWS_LAMBDA_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY,
    },
  },
});

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const console = Logger("runtime-server");

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

app.use("/", agentRouter);
app.use("/models", modelsRouter);
// app.use("/oauth", oauthRouter);
// app.use("/emb/swagger", swaggerUi.serve);
// app.use("/", embodimentRoutes);

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
