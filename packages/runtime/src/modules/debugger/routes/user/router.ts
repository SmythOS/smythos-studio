import dataPoolsRouter from '@debugger/features/datapools/router.datapools';
import AgentLoader from '@debugger/middlewares/agentLoader.mw';
import { Component, ComponentInstances, ConnectorService, ISchedulerRequest, Logger } from '@smythos/sre';
import express from 'express';
import smythfsRouter from './smythfs.router';

const console = Logger('[Builder] Router: Models');
const router = express.Router();

const middlewares = [AgentLoader];

router.use('/smythfs', smythfsRouter);
router.use('/data-pools', dataPoolsRouter);

const triggerRegisterHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const agentData = req._agent;

    const componentData = agentData.components.find((c: any) => c.id === id);
    const trigger: Component = ComponentInstances[componentData.name];
    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    const triggerEndpoint = componentData.data.triggerEndpoint;
    const agentDomain = agentData.domain;
    const isTestDomain = agentData.usingTestDomain;
    let protocol = 'https';
    if (process.env.AGENT_DOMAIN_PORT) {
      if (agentDomain.includes(`.${process.env.AGENT_DOMAIN}`) || agentDomain) {
        protocol = 'http';
      }
    }

    // const triggerUrl = `https://9f5e25c3929d.ngrok-free.app/trigger/${triggerEndpoint}`;
    const triggerUrl = `${req.protocol}://${agentDomain}/trigger/${triggerEndpoint}`;
    // console.log('Registering trigger', triggerUrl, { isTestDomain, agentDomain });
    // await trigger.register(id, componentData.data, { triggerUrl });
    await trigger.register(id, componentData.data, { agentData, triggerUrl });
    return res.status(200).json({ message: 'Trigger registered' });
  } catch (error) {
    // console.error('Error registering trigger', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

router.post('/trigger/:id/register', middlewares, triggerRegisterHandler);
// router.get('/trigger/:id/register', middlewares, triggerRegisterHandler);

router.post(`/schedule/:triggerName`, middlewares, async (req: any, res) => {
  try {
    const agent: any = req._agent;
    const triggerName = req.params.triggerName;
    const schedulerConnector = ConnectorService.getSchedulerConnector();
    if (!schedulerConnector) {
      return res.status(500).json({ error: 'Scheduler connector not found' });
    }

    const schedulerRequester: ISchedulerRequest = schedulerConnector.agent(agent.id);
    const jobId = `job-${agent.id}-${triggerName}`;
    // for testing
    // await schedulerRequester.add(jobId, new Job({ agentId: agent.id, type: 'trigger', triggerName }), Schedule.every('10 seconds'));
    return res.status(200).json({ message: 'Job scheduled successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to schedule job' });
  }
});

export default router;
