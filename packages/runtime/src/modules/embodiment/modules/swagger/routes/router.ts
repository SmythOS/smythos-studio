import express from 'express';
import swaggerUi from 'swagger-ui-express';

import config from '@core/config';
import { getOpenAPIJSON } from '@embodiment/helpers/openapi-adapter.helper';
import agentLoader from '@embodiment/middlewares/agentLoader.mw';
import { Agent } from '@smythos/sre';

const router = express.Router();

// router.use(swaggerUi.serve);

router.use('/', agentLoader, async (req: any, res) => {
  //TODO : handle release switch : dev, prod, prod old versions [DONE]
  const agent: Agent = req._agent;
  let domain = req.hostname;
  // const debugSessionEnabled = agent.debugSessionEnabled;
  const isTestDomain = agent.usingTestDomain;
  // FIXME : use the right version depending on domain [FIXED]
  // const version = isTestDomain ? '' : 'latest';
  const openApiDocument = await getOpenAPIJSON(req._rawAgent, domain, req._agentVersion, false);

  if (agent?.data?.auth?.method && agent?.data?.auth?.method != 'none') {
    // Add or update security definitions
    openApiDocument.components = openApiDocument.components || {};
    openApiDocument.components.securitySchemes = {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      },
    };
    openApiDocument.security = [{ ApiKeyAuth: [] }];
  }

  let htmlContent = swaggerUi.generateHTML(openApiDocument);

  let debugScript = '<script src="/static/embodiment/swagger/swagger.js"></script>';
  if (isTestDomain) {
    debugScript += `
<script src="/static/embodiment/swagger/swagger-debug.js"></script>
<script>
initDebug('${config.env.UI_SERVER}', '${agent.id}');
</script>
`;
  }

  //inject the debug script before closing body tag
  htmlContent = htmlContent.replace('</body>', `${debugScript}</body>`);
  res.send(htmlContent);
});

export { router as swaggerRouter };
