import httpStatus from 'http-status';
import ApiError from '../../../../../utils/apiError';
import { PRISMA_ERROR_CODES } from '../../../../../utils/general';
import { Prisma } from '../../../../../utils/models';
import { AbstractDeployer, DeployParams } from './AbstractDeployer';
import axios from 'axios';
import { versionUtils } from '../../../../../utils';
import crypto from 'crypto';
import { LOGGER } from '../../../../../../config/logging';

export class DistributionDeployer extends AbstractDeployer {
  async deploy(params: DeployParams) {
    const aggregatedSettings = params.aiAgent.settings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting.value }), {});

    // create a signatire for the deployment (to be used by the distribution to verify the deployment)
    const tempSig = crypto.randomBytes(16).toString('hex');

    const distResponse = await axios
      .post(`${params.distribution.url}/deploy`, {
        agentId: params.aiAgent.id,
        majorVersion: params.payload.versionComponents.major,
        minorVersion: params.payload.versionComponents.minor,
        data: params.aiAgent.snapshotData || {},
        settings: aggregatedSettings,
        signature: tempSig,
      })
      .catch(err => {
        LOGGER.error('Failed to deploy on the distribution', err);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to deploy on the distribution');
      });

    if (distResponse.status !== httpStatus.OK) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to deploy on the distribution');
    }

    // WARNING: do not attempt to save the settings or data on our server because the data shoud be saved on the distribution
    const _newDeployment = await params.tx.aiAgentDeployment.create({
      data: {
        aiAgent: {
          connect: {
            id: params.aiAgent.id,
          },
        },
        majorVersion: params.payload.versionComponents.major,
        minorVersion: params.payload.versionComponents.minor,
        //* This is a special structure to indicate the distribution the agent is deployed on
        aiAgentData: {
          version: params.aiAgent.snapshotData?.version || '1.0.0',
          dist: {
            id: params.distribution.id,
            url: params.distribution.url,
          },
        },
        aiAgentSettings: null,

        releaseNotes: params.payload.releaseNotes,
      },
    });

    return _newDeployment;
  }
}
