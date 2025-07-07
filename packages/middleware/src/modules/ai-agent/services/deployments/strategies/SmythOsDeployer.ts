import { AbstractDeployer, DeployParams } from './AbstractDeployer';

export class SmythOsDeployer extends AbstractDeployer {
  async deploy(params: DeployParams) {
    // check if this agent is the first time to be deployed, if so, check QUOTA

    /**
     * Cases to reject a version:
     * - an existing existing with the same major and the minor equals to or higher than the existing record minor
     * - an existing record with a higher major
     */

    const aggregatedSettings = params.aiAgent.settings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting.value }), {});

    // if no distribution id is provided, deploy on SmythOS
    const _newDeployment = await params.tx.aiAgentDeployment.create({
      data: {
        aiAgent: {
          connect: {
            id: params.aiAgent.id,
          },
        },
        majorVersion: params.payload.versionComponents.major,
        minorVersion: params.payload.versionComponents.minor,
        aiAgentData: params.aiAgent.snapshotData || {},
        aiAgentSettings: aggregatedSettings,
        releaseNotes: params.payload.releaseNotes,
      },
    });

    return _newDeployment;
  }
}
