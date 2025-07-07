import { AuthStrategy } from '.';
import { config } from '../../../../../../config/config';
import { LOGGER } from '../../../../../../config/logging';

export default class ApiKeyM2M implements AuthStrategy {
  name = 'apiKeyM2M';

  async verifyToken(token: string) {
    const matchingAPIKey = config.variables.SMYTH_API_KEY;
    let error: string | null = null;

    if (!matchingAPIKey) {
      LOGGER.error(new Error('No M2M API Key found in config'));
      error = 'Internal Server Error';
    }

    const success = token === matchingAPIKey;

    if (!success) {
      LOGGER.error(new Error(`API Key verification failed for token: ${token}. Unmatched API Key.`));
      error = 'Invalid API Key';
    }

    return { error, data: null, success };
  }
}
