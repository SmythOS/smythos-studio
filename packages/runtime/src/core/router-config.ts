import { Express } from "express";

import { uploadHandler } from "@core/middlewares/uploadHandler.mw";

import agentRunnerAgentLoader from "@agent-runner/middlewares/agentLoader.mw";
import agentRunnerOauthRouter from "@agent-runner/routes/_oauth/router";
import { processAgentRequest as agentRunnerProcessAgentRequest } from "@agent-runner/services/agent-request-handler";

import debuggerAgentLoader from "@debugger/middlewares/agentLoader.mw";
import modelsRouter from "@debugger/routes/models/router";
import {
  createSseConnection as debuggerCreateSseConnection,
  getDebugSession as debuggerGetDebugSession,
  processAgentRequest as debuggerProcessAgentRequest,
} from "@debugger/services/agent-request-handler";

import {
  RuntimeConfig,
  loadRuntimeConfig,
  validateRuntimeConfig,
} from "./runtime-config";
import {
  createAgentRunnerRouter,
  createDebuggerRouter,
} from "./shared-agent-router";
import { createConfiguredSmartRouter } from "./smart-agent-router";

/**
 * Configures and mounts agent routers based on runtime configuration
 * Designed for future server extraction without code changes
 *
 * The extraction script will set SMYTHOS_SERVER_TYPE environment variable:
 * - 'combined': All services in one server (default)
 * - 'debugger': Only debugger service
 * - 'agent-runner': Only agent-runner service
 * - 'embodiment': Only embodiment service
 */
export function configureAgentRouters(
  app: Express,
  runtimeConfig?: RuntimeConfig
) {
  const config = runtimeConfig || loadRuntimeConfig();

  // Validate configuration
  const validation = validateRuntimeConfig(config);
  if (!validation.valid) {
    throw new Error(
      `Invalid runtime configuration: ${validation.errors.join(", ")}`
    );
  }

  console.log(`Configuring ${config.serverType} server with services:`, {
    debugger: config.services.debugger.enabled,
    agentRunner: config.services.agentRunner.enabled,
    embodiment: config.services.embodiment.enabled,
    routing: config.routing.strategy,
  });

  // Mount common routes that should be available in all server configurations
  console.log("Mounting /models route (available for all server types)");
  app.use("/models", modelsRouter);

  // Configure based on routing strategy and enabled services
  const debuggerEnabled = config.services.debugger.enabled;
  const agentRunnerEnabled = config.services.agentRunner.enabled;
  const embodimentEnabled = config.services.embodiment.enabled;

  // Smart routing: Multiple services with intelligent request routing
  if (
    config.routing.strategy === "smart" &&
    debuggerEnabled &&
    agentRunnerEnabled
  ) {
    console.log("Using smart router for intelligent request routing");

    const smartRouter = createConfiguredSmartRouter(
      {
        debugger: {
          middlewares: [uploadHandler, debuggerAgentLoader],
          processAgentRequest: debuggerProcessAgentRequest,
          getDebugSession: debuggerGetDebugSession,
          createSseConnection: debuggerCreateSseConnection,
        },
        agentRunner: {
          middlewares: [uploadHandler, agentRunnerAgentLoader],
          processAgentRequest: agentRunnerProcessAgentRequest,
        },
      },
      {
        enableMetrics: config.server.metrics,
        enableDebuggerRoutes: debuggerEnabled,
      }
    );

    app.use("/", smartRouter);
    return;
  }

  // Separate routing: Mount individual routers (extraction-ready)
  if (
    config.routing.strategy === "separate" ||
    config.routing.strategy === "smart"
  ) {
    if (debuggerEnabled) {
      console.log("Mounting debugger router");
      const debuggerRouter = createDebuggerRouter(
        [uploadHandler, debuggerAgentLoader],
        debuggerProcessAgentRequest,
        {
          getDebugSession: debuggerGetDebugSession,
          createSseConnection: debuggerCreateSseConnection,
        }
      );
      app.use("/", debuggerRouter);
    }

    if (agentRunnerEnabled) {
      console.log("Mounting agent-runner router");
      const agentRunnerRouter = createAgentRunnerRouter(
        [uploadHandler, agentRunnerAgentLoader],
        agentRunnerProcessAgentRequest
      );
      app.use("/", agentRunnerRouter);

      // Mount agent-runner-specific routes
      console.log("Mounting /oauth route for agent-runner");
      app.use("/oauth", agentRunnerOauthRouter);
    }

    // Note: Embodiment router will be mounted here when embodimentEnabled is true
    // This is where the extraction script will know to include embodiment routes
  }

  // Legacy routing: Use original individual routers (for backward compatibility)
  if (config.routing.strategy === "legacy") {
    console.log("Using legacy routing with original routers");

    if (debuggerEnabled) {
      import("@debugger/routes/agent/routes").then(
        ({ default: debuggerRouter }) => {
          app.use("/", debuggerRouter);
        }
      );
    }

    if (agentRunnerEnabled) {
      import("@agent-runner/routes/agent/router").then(
        ({ default: agentRunnerRouter }) => {
          app.use("/", agentRunnerRouter);
        }
      );
    }
  }
}

/**
 * Configuration helpers for different deployment scenarios
 * These will be used by the extraction script
 */

// For backward compatibility - these functions now return RuntimeConfig
export function createDebuggerServerConfig(): RuntimeConfig {
  return {
    serverType: "debugger",
    services: {
      debugger: { enabled: true, standalone: true },
      agentRunner: { enabled: false, standalone: false },
      embodiment: { enabled: false, standalone: false },
    },
    routing: { strategy: "separate" },
    server: {
      port: parseInt(process.env.PORT || "5053"),
      name: "smythos-debugger-server",
      healthCheck: true,
      metrics: true,
    },
    features: {
      smartRouting: false,
      requestTracing: true,
      circuitBreaker: false,
      rateLimiting: false,
    },
  };
}

export function createAgentRunnerServerConfig(): RuntimeConfig {
  return {
    serverType: "agent-runner",
    services: {
      debugger: { enabled: false, standalone: false },
      agentRunner: { enabled: true, standalone: true },
      embodiment: { enabled: false, standalone: false },
    },
    routing: { strategy: "separate" },
    server: {
      port: parseInt(process.env.PORT || "5053"),
      name: "smythos-agent-runner-server",
      healthCheck: true,
      metrics: true,
    },
    features: {
      smartRouting: false,
      requestTracing: true,
      circuitBreaker: true,
      rateLimiting: true,
    },
  };
}

export function createEmbodimentServerConfig(): RuntimeConfig {
  return {
    serverType: "embodiment",
    services: {
      debugger: { enabled: false, standalone: false },
      agentRunner: { enabled: false, standalone: false },
      embodiment: { enabled: true, standalone: true },
    },
    routing: { strategy: "separate" },
    server: {
      port: parseInt(process.env.PORT || "5053"),
      name: "smythos-embodiment-server",
      healthCheck: true,
      metrics: true,
    },
    features: {
      smartRouting: false,
      requestTracing: true,
      circuitBreaker: false,
      rateLimiting: false,
    },
  };
}

export function createCombinedServerConfig(): RuntimeConfig {
  return {
    serverType: "combined",
    services: {
      debugger: { enabled: true, standalone: false },
      agentRunner: { enabled: true, standalone: false },
      embodiment: { enabled: true, standalone: false },
    },
    routing: { strategy: "smart" },
    server: {
      port: parseInt(process.env.PORT || "5053"),
      name: "smythos-runtime-combined",
      healthCheck: true,
      metrics: true,
    },
    features: {
      smartRouting: true,
      requestTracing: true,
      circuitBreaker: true,
      rateLimiting: true,
    },
  };
}
