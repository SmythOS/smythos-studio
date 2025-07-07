import fs from 'fs';
import path from 'path';
import { getDirname } from '../utils/general';

const ensureDataDir = () => {
  const rootPath = path.join(getDirname(), '..');
  const dataDir = path.join(rootPath, 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

export default ensureDataDir;
