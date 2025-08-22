import crypto from 'crypto';
import _ from 'lodash';
import { agentDeploymentsService } from '.';
import { prisma } from '../../../../prisma/prisma-client';
import modelAgents from '../../../data/model-agents.json';
import ApiError from '../../../utils/apiError';

/**
 * Service class for handling model agent operations
 */
class ModelAgentService {
  private readonly AGENT_PREFIX = 'model-';

  /**
   * Checks if an ID belongs to a model agent
   * @param id - The agent ID to check
   * @returns boolean indicating if ID is for a model agent
   */
  public isModelAgentId(id: string, teamId: string): boolean {
    // EXPECTED FORMAT: model-agent-${model_name}-${teamId} (model name can be anything)
    // use fastest hash logic for getting 4 (md5)
    const teamHash = this.shortenId(teamId);
    const regex = new RegExp(`^${this.AGENT_PREFIX}(.+)-${teamHash}$`);

    return regex.test(id);
  }

  public async listModelAgents(teamId: string) {
    /*
    we list model agents with the following generic logic
    - get all model files in the /model-agents folder
    - for each model file, list an skeleton agent with the following id = ${model-filename}-${teamId} 
    */

    return modelAgents.map(model => {
      const id = `${model.idPrefix}-${this.shortenId(teamId)}`;
      return {
        id,
        name: model.fileData.name,
        description: model.fileData.shortDescription || model.fileData.description,
        avatar: model.settings?.find(setting => setting.key === 'avatar')?.value,
      };
    });
  }

  /**
   * Retrieves a model agent by ID with optional includes
   * @param id - The agent ID
   * @param teamId - The team ID
   * @param options - Query options including what relations to include
   */
  public async getModelAgentById(id: string, teamId: string, parentTeamId: string, options: { include: string[] }) {
    // let agent = await this.getAgent(id, teamId, options);
    let agent: any = await prisma.aiAgent.findUnique({
      where: {
        id,
        teamId,
      },
      select: this.getAgentSelect(options),
    });

    // for backward compatibility, add to the agent an empty domain object
    agent.domain = [];

    // Get template data to check if agent is up to date
    const tmpl = await this.prepareTemplateData({ id, teamId, parentTeamId });

    if (!agent) {
      // Create new agent if it doesn't exist
      console.log(`Creating new model agent. id: ${id} TeamId: ${teamId}`);
      return this.setupModelAgent(id, teamId, tmpl, options);
    }

    // Compare template data with agent data
    const changed = await this.diff(agent, tmpl);
    if (changed.data || changed.settings) {
      console.log(`Updating model agent. id: ${id} TeamId: ${teamId}`);
      agent = await this.updateAgent(id, agent, tmpl, changed, options);
    }

    const { name, updatedAt, aiAgentData, domain, lockId, lastLockBeat, lastLockSaveOperation, ...rest } = agent;
    //   const isLocked = agentHasValidLock(agent.lastLockBeat, agent.lastLockSaveOperation, agent.lockId);

    return {
      name,
      updatedAt,
      data: aiAgentData?.data,
      domain: agent.domain,
      ...rest,
    };
    // return agent;
  }

  /**
   * Gets template data for an agent from Redis cache or file system
   * @param id - The agent ID
   * @returns Template data and settings
   */
  private async prepareTemplateData({ id, teamId, parentTeamId }: { id: string; teamId: string; parentTeamId: string }): Promise<TemplateData> {
    // e.g model-gpt-4o-mini-clv1cv00t0001alug52hd69j8  WE should extract gpt-4o-mini from this
    // format: model-${model_name}-${teamId}
    const tmplId = id.split('-').slice(0, -1).join('-');
    const agent = modelAgents.find(model => model.idPrefix === tmplId);
    if (!agent) {
      throw new ApiError(404, `Model agent ${tmplId} not found`);
    }

    const tmplData = agent.fileData;
    tmplData.id = id;
    tmplData.teamId = teamId;
    tmplData.parentTeamId = parentTeamId;
    (tmplData as any).debugSessionEnabled = false;
    const settings = agent.settings.map(s => ({
      ...s,
      aiAgentId: id,
    }));

    return { tmplData, settings };
  }

  private async setupModelAgent(id: string, teamId: string, data: TemplateData, options: { include: string[] }) {
    /*
    Atomically
    1. create agent
    2. create agent settings
    3. create initial deployment so the user can chat with it
    */

    const agent = await prisma.$transaction(
      async tx => {
        const _agent = await tx.aiAgent.create({
          data: {
            id,
            teamId,
            name: data.tmplData?.name || 'Model',
            aiAgentData: {
              create: {
                data: data.tmplData,
              },
            },
            aiAgentSettings: {
              create: data.settings.map(s => ({
                key: s.key,
                value: s.value,
              })),
            },
          },
          select: this.getAgentSelect(options),
        });

        // for backward compatibility, add to the agent an empty domain object
        (_agent as any).domain = [];

        return _agent;
      },
      { timeout: 120_000 },
    );

    // TODO: move this into the transaction by making this service call Transactional<>
    await agentDeploymentsService.createDeployment({
      aiAgentId: agent.id,
      teamId,
    });

    return agent;
  }

  private async diff(agent, tmpl: TemplateData) {
    const settings = await prisma.aiAgentSettings.findMany({
      where: {
        aiAgentId: agent.id,
      },
      select: {
        key: true,
        value: true,
      },
    });
    const pickSettings = (obj: any) => {
      return _.pick(obj, 'key', 'value');
    };
    return {
      data: !_.isEqual(agent.aiAgentData?.data, tmpl.tmplData),
      settings: !_.isEqual(pickSettings(settings), pickSettings(tmpl.settings)),
    };
  }

  private async updateAgent(id: string, agent, tmpl: TemplateData, changed: { data: boolean; settings: boolean }, options: { include: string[] }) {
    return prisma.$transaction(
      async tx => {
        if (changed.data) {
          //   await tx.aiAgentData.update({
          //     where: { aiAgentId: id },
          //     data: { data: tmpl.tmplData },
          //     select: null,
          //   });
          await tx.aiAgent.update({
            where: { id },
            data: {
              aiAgentData: {
                update: {
                  data: tmpl.tmplData,
                },
              },
              name: tmpl.tmplData.name,
            },
          });
        }
        if (changed.settings) {
          for (const setting of tmpl.settings) {
            await tx.aiAgentSettings.update({
              where: { id: setting.id },
              data: { value: setting.value },
              select: null,
            });
          }
        }

        let _agent = await tx.aiAgent.findUnique({
          where: { id: agent.id },
          select: this.getAgentSelect(options),
        });

        // for backward compatibility, add to the agent an empty domain object
        (_agent as any).domain = [];

        return _agent;
      },
      { timeout: 120_000 },
    );
  }

  private getAgentSelect(options: { include: string[] }) {
    return {
      id: true,
      aiAgentData: {
        select: {
          data: true,
        },
      },
      name: true,
      updatedAt: true,
      description: true,
      ...(options.include?.includes('team.subscription')
        ? {
            team: {
              select: {
                name: true,
                id: true,
                parentId: true,
                subscription: {
                  select: {
                    id: true,
                    properties: true,
                  },
                },
              },
            },
          }
        : {}),
      _count: {
        select: {
          AiAgentDeployment: true,
        },
      },
      lastLockBeat: true,
      lastLockSaveOperation: true,
      lockId: true,
      lockedByName: true,
    };
  }

  private shortenId = (id: string, length = 8): string => {
    return crypto.createHash('md5').update(id).digest('hex').slice(0, length);
  };
}

interface TemplateData {
  tmplData: { [key: string]: any } | null;
  settings: { [key: string]: any }[] | null;
}

export const modelAgentService = new ModelAgentService();
