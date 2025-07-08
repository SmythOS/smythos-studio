import express, { Request, Response } from 'express';

import {
  getAgents,
  getAgentPluginInfo,
  saveUserSettings,
  getUserSettings,
  deleteUserSettings,
} from '../../../services/user-data.service';
import { APIResponse } from '../../../types/';
import { includeTeamDetails } from '../../../middlewares/auth.mw';

const router = express.Router();

const AGENT_PLUGINS_SETTINGS_KEY = 'AgentPlugins';

router.post('/', [includeTeamDetails], async (req: Request, res: Response<APIResponse>) => {
  let { data = null } = req.body;
  const agentId = data?.resourceKey;

  if (agentId) {
    const agentRes = await getAgentPluginInfo(req, agentId);

    if (!agentRes?.success) {
      return res.status(400).json({ success: false, error: agentRes?.error });
    }

    data = agentRes?.data;
  }

  if (!data?.name) {
    return res.status(400).json({ success: false, error: `Agent Component not found!` });
  }

  data.teamId = req?._team?.id;

  const settingsRes = await saveUserSettings(
    req?.user?.accessToken,
    AGENT_PLUGINS_SETTINGS_KEY,
    data,
  );

  if (!settingsRes?.success) {
    return res.status(400).json({ success: false, error: settingsRes?.error });
  }

  res.send({ success: true, data });
});

router.get('/', [includeTeamDetails], async (req, res) => {
  try {
    const savedAgentPlugins = await getUserSettings(
      req?.user?.accessToken,
      AGENT_PLUGINS_SETTINGS_KEY,
    );
    const teamId = req?._team?.id;

    let agentPlugins;

    if (savedAgentPlugins.some((plugin) => !plugin?.teamId)) {
      // If the agent plugin does not have a teamId, fetch all agents and assign a teamId to ensure proper display based on their corresponding team spaces.
      const agentRes = await getAgents(req, false);
      const agents = agentRes?.agents;

      if (agents?.length > 0) {
        const agentIds = new Set(agents?.map((agent) => agent.id));

        agentPlugins = savedAgentPlugins
          .filter((plugin) => agentIds.has(plugin?.id))
          .map((plugin) => ({ ...plugin, teamId }));

        if (agentPlugins?.length > 0) {
          // Fire-and-forget: save agent plugins with team IDs without blocking execution, because it does not have any impact on the response
          saveUserSettings(
            req?.user?.accessToken,
            AGENT_PLUGINS_SETTINGS_KEY,
            agentPlugins,
            'overwrite',
          );
        }
      }
    } else {
      agentPlugins = savedAgentPlugins.filter((plugin) => plugin?.teamId === teamId);
    }

    res.send({ success: true, data: agentPlugins });
  } catch (error) {
    res.status(400).json({ success: false, error });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const deleteRes = await deleteUserSettings(
    req?.user?.accessToken,
    AGENT_PLUGINS_SETTINGS_KEY,
    id,
  );

  if (!deleteRes?.success) {
    return res.status(400).json({ success: false, error: deleteRes?.error });
  }

  res.send({
    success: true,
    data: {
      id,
      message: 'Agent Component deleted successfully!',
    },
  });
});

export default router;
