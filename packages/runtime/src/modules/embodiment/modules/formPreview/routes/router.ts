import config from '@core/config';
import { callSkill } from '@embodiment/helpers/formPreview.helper';
import agentLoader from '@embodiment/middlewares/agentLoader.mw';
import { Agent } from '@smythos/sre';
import express from 'express';

const router = express.Router();

const middlewares = [agentLoader];
router.use(middlewares);

router.get('/', async (req, res) => {
  const agent: Agent = req._agent;

  res.send(`
<!doctype html>
<html lang="en" style="height: 100%;margin: 0;padding: 0;">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${agent.name}</title>
</head>
<body style="height: 100%;margin: 0;padding: 0;">
    <div id="form-preview-container" style="height: 100%;"></div>
    <script src="/static/embodiment/formPreview/form-preview-minified.js"></script>
    <script>
        FormPreview.init({
            domain:'${req.hostname}',
            containerId: 'form-preview-container',
            widget: false,
        });
    </script>
</body>
</html>`);
});

router.get('/params', async (req, res) => {
  const agent: Agent = req._agent;

  const promises = [agent.agentSettings?.ready()];

  await Promise.all(promises);

  const isLocalAgent = req.hostname.includes('localagent');
  const agentId = agent?.id;

  const port = isLocalAgent ? config.env.AGENT_DOMAIN_PORT : undefined;
  const agentData = {
    id: agentId,
    name: agent.name,
    components: agent.components,
    domain: agent?.domain,
    port,
  };

  res.send(agentData);
});

router.post('/call-skill', async (req, res) => {
  const agent: Agent = req._agent;

  const agentId = agent?.id;
  const { componentId, payload, version } = req.body;

  const component = (agent.data as Agent).components.find(c => c.id === componentId);

  if (!component) {
    res.status(404).send({ error: 'Component not found' });
  }

  const response = await callSkill({
    params: { agentId },
    body: {
      componentId: componentId as string,
      payload: payload as Record<string, any>,
      version: version as 'dev' | 'latest',
    },
    endpoint: component.data.endpoint!,
  });
  res.status(200).json({ response });
});

export { router as formPreviewRouter };
