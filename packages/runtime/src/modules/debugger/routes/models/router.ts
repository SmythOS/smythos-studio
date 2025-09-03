import { createHash } from "crypto";
import express, { Response } from "express";

import {
  AccessCandidate,
  ConnectorService,
  Logger,
  ModelsProviderConnector,
} from "@smythos/sre";

import { teamAccessCheck } from "@debugger/middlewares/teamAccessCheck.mw";

const console = Logger("[Builder] Router: Models");
const router = express.Router();

// Constants
const MODELS_HASH_KEY = "models_content_hash";

router.head("/", async (req, res, next) => {
  try {
    const modelsHash = await getModelsHash();

    res.setHeader("x-models-hash", modelsHash);
    res.status(200).send();
  } catch (error) {
    handleError(error, res);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const models = await getModels();
    const modelsHash = await getModelsHash();

    // #region Cache model hash
    // Update cache with new hash
    const cacheConnector = ConnectorService.getCacheConnector();
    // We are intentionally not awaiting this operation, as updating the model hash does not need to block the response.
    cacheConnector
      .user(AccessCandidate.user("system-smyth"))
      ?.set(MODELS_HASH_KEY, modelsHash)
      .catch((err) => {
        console.warn("Updating models hash cache error:", err?.message || err);
      });
    // #endregion Cache model hash

    res.setHeader("x-models-hash", modelsHash);
    res.status(200).send(models);
  } catch (error) {
    handleError(error, res);
  }
});

router.get("/custom/:teamId", teamAccessCheck, async (req, res, next) => {
  try {
    const teamId = req.params.teamId;

    if (!teamId) {
      return res.status(400).send({ error: "Team ID is required" });
    }

    const models = await getCustomModels(teamId);

    res.status(200).send(models || {});
  } catch (error) {
    handleError(error, res);
  }
});

async function getCustomModels(teamId: string): Promise<Record<string, any>> {
  const modelsProviderConnector: ModelsProviderConnector =
    ConnectorService.getModelsProviderConnector();
  const modelProviderCandidate = modelsProviderConnector.requester(
    AccessCandidate.team(teamId)
  );
  const models = await modelProviderCandidate.getCustomModels();
  return models;
}

// Helper functions

async function getModels(): Promise<Record<string, any>> {
  const modelsProviderConnector: ModelsProviderConnector =
    ConnectorService.getModelsProviderConnector();
  const modelProviderCandidate = modelsProviderConnector.requester(
    AccessCandidate.user("system-smyth")
  );
  const models = await modelProviderCandidate.getModels();
  return models;
}

async function getModelsHash(): Promise<string> {
  const models = await getModels();
  const modelsString = JSON.stringify(models);
  const hash = createHash("sha256").update(modelsString).digest("hex");

  return hash;
}

function handleError(error: any, res: Response): void {
  console.warn("Error in models route:", error);

  const status = error.status || 500;
  const message = error.message || "Internal server error";

  res.status(status).send({ error: message });
}

export default router;
