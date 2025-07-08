import axios from 'axios';

import { LLMService } from './LLMHelper/LLMService.class';

import config from '../config';
import { STANDARD_MODELS_CACHE_KEY } from '../constants';

const memCache = new Map<string, number>();
const MODELS_HASH_CACHE_KEY = '__models_hash';
const MODELS_POLLING_INTERVAL = 10000;

const llmService = new LLMService();

export class ModelsPollingService {
  private interval: NodeJS.Timeout | null = null;

  public async start() {
    // Ignore if already running (interval exists)
    if (this.interval) {
      return;
    }

    this.interval = setInterval(async () => {
      await this.refreshModelsIfChanged();
    }, MODELS_POLLING_INTERVAL);

    console.log('🟢 ModelsPollingService: started');
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('🔴 ModelsPollingService: stopped');
  }

  private async refreshModelsIfChanged() {
    const hasModelsChanged = await this.hasModelsChanged();

    if (hasModelsChanged) {
      const latestModels = await llmService.getFreshStandardModels();

      if (latestModels && Object.keys(latestModels).length > 0) {
        await llmService.cacheModels(latestModels, STANDARD_MODELS_CACHE_KEY);

        console.log('♻️  ModelsPollingService: refreshed');
      }
    }
  }

  private async hasModelsChanged() {
    try {
      const url = `${config.env.API_SERVER}/models`;
      const result = await axios.head(url);

      const currentHash = memCache.get(MODELS_HASH_CACHE_KEY);
      const newHash = result.headers['x-models-hash'];

      if (currentHash !== newHash) {
        console.log('🟡 ModelsPollingService: change detected');

        memCache.set(MODELS_HASH_CACHE_KEY, newHash);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}
