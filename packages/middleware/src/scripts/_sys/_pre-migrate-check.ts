import 'dotenv/config';
import { config } from '../../../config/config';

try {
  if (config.variables.DATABASE_URL === config.variables.LOGS_DATABASE_URL) {
    throw new Error(
      'DATABASE_URL and LOGS_DATABASE_URL cannot be the same. This can lead to schema corruption. Please make sure you are using different databases for the application and logs.',
    );
  }

  console.log('Pre-migration script ran successfully.');
} catch (error) {
  console.error('Pre-migration script failed with error:', error);
  process.exit(1);
}
