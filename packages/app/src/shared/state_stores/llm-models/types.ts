import { LLMModel } from '../../types';
import { Slice } from '../index';

export interface LLMModelsSlice extends Slice {
  models: Record<string, LLMModel>;
  isLoading: boolean;
  error: string | null;
  fetchModels: () => Promise<void>;
}
