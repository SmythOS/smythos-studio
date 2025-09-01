import express from 'express';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import { autoGenerateAvatarForAgent } from '../../../services/falai-helper';
import * as openai from '../../../services/openai-helper';
import * as userData from '../../../services/user-data.service';
const router = express.Router();

router.post('/', [includeTeamDetails], async (req, res) => {
  const { name, id, data, lockId, hasAvatar = false } = req.body;
  const userId = req?._user?.id;
  const userName = req?._user?.name || req?._user?.email;
  const teamId = req?._team?.id;
  let avatar;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData
    .saveAgent({ req, id, name, lockId, data, userName, teamId })
    .catch((error) => ({ error }));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }

  const beforeAvatarGenerationTimestamp = Date.now();

  try {
    // #region TODO: move this responsibility to the caller
    const existingAvatar = await userData.getAgentSettings(req, result.id, 'avatar');
    if (!existingAvatar && hasAvatar !== true) {
      avatar = await autoGenerateAvatarForAgent(req, result.id, req._team.id);
    }
  } catch (error) {
    console.error('Error handling avatar generation:', error);
  }

  const afterAvatarGenerationTimestamp = Date.now();
  console.log(
    `Avatar generation took ${afterAvatarGenerationTimestamp - beforeAvatarGenerationTimestamp}ms`,
  );

  return res.send({ success: true, id: result.id, name: result.name, avatar });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData.deleteAgent(req, id).catch((error) => ({ error }));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }
  res.send({ success: true });
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
  res.send({ success: true, agentId, domain, endpoint });
});

router.get('/endpoint/:domain/:endpoint', async (req, res) => {
  console.log(`GET /endpoint/:domain/:endpoint`, req.params);
  const { domain, endpoint } = req.params;
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData.getEndpoint(req, domain, endpoint).catch((error) => {
    console.error(error);
    return { error };
  });
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }

  res.send({ success: true, data: result.endpoint });
});

router.delete('/endpoint/:domain/:endpoint', async (req, res) => {
  const { domain, endpoint } = req.params;
  const { agentId, componentId } = req.body;
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData
    .deleteEndpoint(req, agentId, componentId, domain, endpoint)
    .catch((error) => ({ error }));
  if (result?.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }

  res.send({ success: true });
});

router.get('/', async (req, res) => {
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData.getAgents(req).catch((error) => ({ error }));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }
  res.send({ success: true, agents: result });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData.getAgent(req, id, true).catch((error) => ({ error }));
  if (result.error) {
    let errorObj = null;
    try {
      errorObj = JSON.parse(result.error.message);
      errorObj.data.message = errorObj.message;
    } catch (e) {
      errorObj = result.error.message;
    }

    return res
      .status(404)
      .json({ success: false, error: errorObj.data.message, errorData: errorObj.data });
  }

  res.send({ success: true, agent: result.agent });
});

router.get('/:id/lock-status', async (req, res) => {
  const { id } = req.params;
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData.getAgentLockStatus(req, id).catch((error) => ({
    error: error?.response?.data,
  }));
  if (result.error) {
    return res.status(400).json({ success: false, ...result.error });
  }
  res.send({ success: true, status: result.status });
});

router.post('/lock', async (req, res) => {
  const { agentId } = req.body;
  const userId = req?._user?.id;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData
    .lockAgent(req, agentId)
    .catch((error) => ({ error: error?.response?.data }));
  if (result.error) {
    return res.status(400).json({ success: false, ...result.error });
  }
  res.send({ success: true, lock: result.lock });
});
router.put('/release-lock', async (req, res) => {
  const { agentId, lockId } = req.body;
  const userId = req?._user?.id;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData
    .unlockAgent(req, agentId, lockId)
    .catch((error) => ({ error: error?.response?.data }));
  if (result.error) {
    return res.status(400).json({ success: false, ...result.error });
  }
  res.send({ success: true });
});
router.post('/request-access', async (req, res) => {
  const { agentId, email } = req.body;

  const result: any = await userData
    .requestAccess(req, agentId, email)
    .catch((error) => ({ error: error?.response?.data }));
  if (result.error) {
    return res.status(400).json({ success: false, ...result.error });
  }
  res.send({ success: true });
});
router.put('/refresh-lock', async (req, res) => {
  const { agentId, lockId } = req.body;
  const userId = req?._user?.id;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData
    .refreshAgentLock(req, agentId, lockId)
    .catch((error) => ({ error: error?.response?.data }));
  if (result.error) {
    return res.status(400).json({ success: false, ...result.error });
  }
  res.send({ success: true });
});

router.get('/:id/debugSession', async (req, res) => {
  const { id } = req.params;
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData.getAgentDebugSession(req, id).catch((error) => ({ error }));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }
  res.send({ success: true, agent: result.agent });
});

router.get('/:id/explain', async (req, res) => {
  const { id } = req.params;
  const userId = req?._user?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  const result: any = await userData.getAgent(req, id).catch((error) => ({ error }));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error.message });
  }
  const explaination = await explain(result.agent);
  res.send({ success: true, data: explaination });
});

async function explain(json) {
  console.log('explain', json);
  const systemContent = `SmythOS allows building complex AI powered workflows to solve enterprise problems.
The workflows combine logical, algorithmic and AI building blocks to achieve complex task while reducing human intervention.

Component
A component is a box that performs an action.
It can have inputs and outputs.
The outputs can be connected to other components inputs.
A component returns outputs after running an internal process.
There are threee component categories :
  - Service components : Runs continuously, and can generate outputs without a trigger, e.g mailbox monitor
  - Binding component : Provides external access to the agent, don't have explicit inputs since the input comes from an external source. this category of components does not process the inputs, instead it just convert them to a usable format and send them to outputs (e.g API endpoint)
  - Logic components : Takes inputs, performs an action and returns outputs.
If a component is the last one in a workflow branch and has no further connections, it's output is preserved and returned to the user after all other workflow branches are executed.
Not all outputs of a component should be connected, it's up to the user to decide which outputs to use and which to ignore.


Workflow
A workflow is a set of components connected to each others leading to an exit component that returns one or multiple outputs.
Multiple workflows can derivate from the same entry point or from different entry points. basically the workflows equals to the branches of all the trees in an agent.
An entry point is a component whose input is not connected to any other component, it's the starting point of a workflow.
An exit point is a component whose all outputs are not connected to any other component, if a single output is connected, the component is not considered as an exit point.
A workflow can have multiple entry points and multiple exit points.


Agent
An agent is composed of one or multiple workflows, in order to work, it should have at least one service component or binding component, in order to trigger its internal workflows.
After processing all workflows, the final output returned to the user is the output from the last component in each workflow.
if there is only one workflow, one output is returned, if there are multiple workflows, multiple outputs are returned in an array.

Agents are encoded in a json format.
###

Your Role :
The user is using Smyth UI to create an agent, if he struggles understanding what the workflows do, he will provide you with json representations of an agent, and you need to describe  the workflow in details, and gives examples when applicable.
Do not describe what the agent does for users, what we need here is a technical description of how he do it, and what happens internally between the components.

Start by describing the workflows : What are the entry points, what data transits between components, what are the expected outputs  ... etc
Then explain the components roles.

If you see problems in the workflow add a section to describe them.

The response structure should be in HTML format using the following structure :
<h2>Workflows</h2>
<p>(Enumerate the workflows with their starting points, their final output and what they do)</p>
<h2>Components</h2>
<p>(describe the user components)</p>
<h2>Issues</h2> (ommit if there is no issues)
<p>(describe the identified issues)</p>

When enumerating or listing information, always use the right formatting for enumarations, bullets ...etc
highlight components names in bold.
you can use colors underline ...etc to highlight important parts of the text when needed.

example of issues that may happen :
 - Missing settings for a component
 - Orphan component : a component where all inputs and outputs are not connected
 - Circular dependency : a component that is connected to itself

(Never refer to JSON in your response, just answer as if you know the workflow)
`;
  const data = await openai.chatRequest(JSON.stringify(json), {
    model: 'gpt-4',
    max_tokens: 1024,
    messages: [{ role: 'system', content: systemContent }],
  });

  console.log('explain response', data);
  return data;
}

export default router;
