import express, { Router } from "express";
import { openaiRouter } from "@embodiment/modules/openai/routes";
import { apiRouter } from "@embodiment/modules/API/routes/router";
import config from "@core/config";
import { chatGPTRouter } from "@embodiment/modules/chatGPT/routes/router";
import { postmanRouter } from "@embodiment/modules/postman/routes/router";
import { swaggerRouter } from "@embodiment/modules/swagger/routes/router";
import { chatBotRouter } from "@embodiment/modules/chatbot/routes/router";
import { agentChatRouter } from "@embodiment/modules/agentChat/routes/router";
import { alexaRouter } from "@embodiment/modules/alexa/routes/router";
import { mcpRouter } from "@embodiment/modules/mcp/routes/router";
import { formPreviewRouter } from "@embodiment/modules/formPreview/routes/router";

const mainRouter = Router();

type Route = {
  rootPath: string | (string | RegExp)[] | RegExp;
  route: Router;
  requireAuth?: boolean;
};

const defaultRoutes: Route[] = [
  {
    rootPath: ["/_openai", "/emb/openai"],
    route: openaiRouter,
  },

  {
    rootPath: ["/postman", "/emb/postman"],
    route: postmanRouter,
  },

  {
    // match /swagger and /swagger/
    rootPath: ["/swagger", "/emb/swagger"],
    route: swaggerRouter,
  },

  {
    rootPath: ["/", "/emb/api"],
    route: apiRouter,
  },
  {
    rootPath: ["/", "/emb/chatgpt"],
    route: chatGPTRouter,
  },
  {
    rootPath: ["/chatbot", "/emb/chatbot"],
    route: chatBotRouter,
  },
  {
    rootPath: ["/aichat", "/emb/aichat"],
    route: agentChatRouter,
  },
  {
    rootPath: ["/alexa", "/emb/alexa"],
    route: alexaRouter,
  },
  {
    rootPath: ["/mcp", "/emb/mcp"],
    route: mcpRouter,
  },
  {
    rootPath: ["/form-preview", "/emb/form-preview"],
    route: formPreviewRouter,
  },
];

const devRoutes: Route[] = [];

defaultRoutes.forEach((route) => {
  if (Array.isArray(route.rootPath)) {
    route.rootPath.forEach((path) => {
      mainRouter.use(path, route.route);
    });
  } else {
    mainRouter.use(route.rootPath, route.route);
  }
});

if (config.env.NODE_ENV === "development") {
  devRoutes.forEach((route) => {
    if (Array.isArray(route.rootPath)) {
      route.rootPath.forEach((path) => {
        mainRouter.use(path, route.route);
      });
    } else {
      mainRouter.use(route.rootPath, route.route);
    }
  });
}

export { mainRouter as routes };
