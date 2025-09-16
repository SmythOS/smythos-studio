import axios from 'axios';

import config from '../../config';
import { cacheClient } from '../../services/cache.service';

type ModelTemplate = {
  [key: string]: {
    label: string;
    modelId: string;
    provider: string;
    features: string[];
    tags: string[];
    tokens: number;
    completionTokens: number;
    searchContextTokens: number;
    enabled: boolean;
    credentials: string | string[];
  };
};

// TODO: this class does not require any parameters, so we can make all the methods static
export class LLMService {
  public async getModels(req): Promise<ModelTemplate | {}> {
    const standardModels = await this.getStandardModels();
    const customModels = await this.getCustomModels(req);

    return { ...standardModels, ...customModels };
  }

  public async getCustomModels(req) {
    const teamId = req?._team?.id;

    try {
      const cachedModels = await this.getModelsFromCache(
        config.cache.getCustomModelsCacheKey(teamId),
      );

      if (Object.keys(cachedModels).length > 0) {
        return cachedModels;
      }

      const latestModels = await this.getFreshCustomModels(req);

      this.cacheModels(latestModels, config.cache.getCustomModelsCacheKey(teamId)).catch(
        (error) => {
          console.error('Error caching models', error?.message);
        },
      );

      return latestModels;
    } catch (error) {
      // If there is an error, return empty array
      return {};
    }
  }

  public async cacheModels(models: ModelTemplate, key: string) {
    await cacheClient.set(key, JSON.stringify(models), 'EX', '1296000'); // 15 days in seconds
  }

  public async getFreshStandardModels(): Promise<ModelTemplate | {}> {
    try {
      const url = `${config.env.API_SERVER}/models`;
      const result = await axios.get(url, { headers: { 'x-smyth-debug': true } });

      return result?.data || {};
    } catch (error) {
      console.warn('Error getting fresh models', error?.message);
      return {};
    }
  }

  public async getFreshCustomModels(req) {
    const teamId = req?._team?.id;
    const accessToken = req?.user?.accessToken;
    try {
      const url = `${config.env.API_SERVER}/models/custom/${teamId}`;
      const result = await axios.get(url, {
        headers: { 'x-smyth-debug': true, Authorization: `Bearer ${accessToken}` },
      });
      return result?.data || {};
    } catch (error) {
      console.warn('Error getting fresh custom models', error?.message);
      return {};
    }
  }

  private async getStandardModels() {
    try {
      const cachedModels = await this.getModelsFromCache(config.cache.STANDARD_MODELS_CACHE_KEY);

      if (Object.keys(cachedModels).length > 0) {
        return cachedModels;
      }

      const latestModels = await this.getFreshStandardModels();

      if (latestModels && Object.keys(latestModels).length > 0) {
        this.cacheModels(latestModels, config.cache.STANDARD_MODELS_CACHE_KEY).catch((error) => {
          console.error('Error caching models', error?.message);
        });
      }

      return latestModels;
    } catch (error) {
      // If there is an error, return empty array
      return {};
    }
  }

  private async getModelsFromCache(key: string) {
    try {
      const cachedModels = await cacheClient.get(key);
      return cachedModels ? JSON.parse(cachedModels) : {};
    } catch (error) {
      return {};
    }
  }
}
