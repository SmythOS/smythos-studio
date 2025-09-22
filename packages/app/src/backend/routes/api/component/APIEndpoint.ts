import { Router } from 'express';
import * as userData from '../../../services/user-data.service';
import { authHeaders, smythAPIReq } from '../../../utils/';

const router = Router();

router.get('/domains', async (req, res) => {
  try {
    const result = await smythAPIReq.get('/domains?verified=true', await authHeaders(req));
    return res.json(result.data.domains);
  } catch (error) {
    console.log('error', error?.message);
    return res.status(500).json({ error });
  }
});

router.post('/update', async (req, res) => {
  let { curDomain, curEndpoint, curMethod, domain, endpoint, newMethod, agentId, componentId } =
    req.body;
  if (curDomain && curDomain != domain && curDomain != '[NONE]') {
    const curEndpointObject = await userData
      .getEndpoint(req, curDomain, curEndpoint)
      .catch((error) => ({ error }));

    if (!curEndpointObject || curEndpointObject.error) {
      return res
        .status(400)
        .json({ success: false, error: curEndpointObject.error.toString || 'Endpoint not found' });
    }

    // const agentId = curEndpointObject.endpoint.agentId;
    // const componentId = curEndpointObject.endpoint.componentId;

    await userData.deleteEndpoint(req, agentId, componentId, curDomain, curEndpoint, true);
    //now update the domain
    const domainResult: any = await smythAPIReq
      .put(
        '/domain',
        {
          name: curDomain,
          data: {
            aiAgentId: null,
          },
        },
        await authHeaders(req),
      )
      .catch((error) => ({ error }));
  }
  if (domain != '[NONE]') {
    const result: any = await userData
      .saveEndpoint(req, agentId, componentId, domain, endpoint)
      .catch((error) => ({ error }));
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error.message });
    }

    //now update the domain
    const domainResult: any = await smythAPIReq
      .put(
        '/domain',
        {
          name: domain,
          data: {
            aiAgentId: agentId.toString(),
          },
        },
        await authHeaders(req),
      )
      .catch((error) => ({ error }));

    if (domainResult.error) {
      return res.status(400).json({ success: false, error: result.error.message });
    }
  }
  res.send({ success: true, agentId, domain, endpoint });
});

router.post('/endpoint', async (req, res) => {
  let { agentId, componentId, domain, endpoint } = req.body;
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData
    .saveEndpoint(req, agentId, componentId, domain, endpoint)
    .catch((error) => ({ error }));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }

  //now update the domain
  const domainResult: any = await smythAPIReq
    .put(
      '/domain',
      {
        name: domain,
        data: {
          aiAgentId: agentId.toString(),
        },
      },
      await authHeaders(req),
    )
    .catch((error) => ({ error }));

  if (domainResult.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }
  res.send({ success: true, agentId, domain, endpoint });
});

export default router;
