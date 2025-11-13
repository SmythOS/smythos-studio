import fs from 'fs';
import path from 'path';
import simpleGit, { GitError, SimpleGit } from 'simple-git';

import { Logger } from '@smythos/sre';

const console = Logger('repo-sync');

/**
 * Configuration for repository synchronization
 */
interface RepoSyncConfig {
  /** Base directory where the repository will be stored */
  baseDir: string;
  /** Repository URL to clone/pull */
  repoUrl: string;
  /** Local directory name where the repository will be cloned */
  localDirName: string;
  /** Sync interval in milliseconds (default: 5 minutes) */
  syncInterval?: number;
}

/**
 * Service to manage periodic synchronization of a git repository
 */
export class RepoSyncService {
  private config: RepoSyncConfig;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private repoPath: string;
  private git: SimpleGit;

  constructor(config: RepoSyncConfig) {
    this.config = {
      ...config,
      syncInterval: config.syncInterval || 5 * 60 * 1000, // Default to 5 minutes
    };
    this.repoPath = path.join(this.config.baseDir, this.config.localDirName);
    this.git = simpleGit();
  }

  /**
   * Start the periodic synchronization service
   */
  public start(): void {
    console.info(`🔄 Starting repository sync service`);
    console.info(`   Repository: ${this.config.repoUrl}`);
    console.info(`   Local path: ${this.repoPath}`);
    console.info(`   Sync interval: ${this.config.syncInterval! / 1000 / 60} minutes`);

    // Perform initial sync
    this.sync().catch((error: Error) => {
      console.error('Failed initial repository sync:', error);
    });

    // Set up periodic sync
    this.syncIntervalId = setInterval(() => {
      this.sync().catch((error: Error) => {
        console.error('Failed periodic repository sync:', error);
      });
    }, this.config.syncInterval);

    console.info('✅ Repository sync service started');
  }

  /**
   * Stop the periodic synchronization service
   */
  public stop(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.info(`🛑 Repository sync service stopped (${this.config.localDirName})`);
    }
  }

  /**
   * Perform a single synchronization operation
   */
  private async sync(): Promise<void> {
    if (this.isSyncing) {
      console.warn('Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;

    try {
      // Ensure base directory exists
      if (!fs.existsSync(this.config.baseDir)) {
        fs.mkdirSync(this.config.baseDir, { recursive: true });
        console.info(`📁 Created base directory: ${this.config.baseDir}`);
      }

      // Check if repository directory exists
      if (fs.existsSync(this.repoPath)) {
        await this.pullRepository();
      } else {
        await this.cloneRepository();
      }
    } catch (error) {
      console.error('Sync operation failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Clone the repository
   */
  private async cloneRepository(): Promise<void> {
    console.info(`📥 Cloning repository: ${this.config.repoUrl}`);

    try {
      await this.git.clone(this.config.repoUrl, this.repoPath);
      console.info(`✅ Successfully cloned repository to ${this.repoPath}`);
    } catch (error) {
      const gitError = error as GitError;
      console.error('Failed to clone repository:', gitError.message);
      throw new Error(`Repository clone failed: ${gitError.message}`);
    }
  }

  /**
   * Pull latest changes from the repository
   */
  private async pullRepository(): Promise<void> {
    console.info(`🔄 Pulling latest changes from ${this.config.repoUrl}`);

    try {
      // Initialize git instance for the repository
      const repoGit = simpleGit(this.repoPath);

      // First, check if the directory is a valid git repository
      const isRepo = await repoGit.checkIsRepo();

      if (!isRepo) {
        console.warn('Directory exists but is not a git repository, removing and re-cloning...');
        fs.rmSync(this.repoPath, { recursive: true, force: true });
        await this.cloneRepository();
        return;
      }

      // Perform git pull
      const pullResult = await repoGit.pull('origin', 'main');

      if (pullResult.summary.changes === 0 && pullResult.summary.insertions === 0 && pullResult.summary.deletions === 0) {
        console.info('📋 Repository is already up to date');
      } else {
        console.info('✅ Successfully pulled latest changes');
        console.info(`   Files changed: ${pullResult.summary.changes}`);
        console.info(`   Insertions: ${pullResult.summary.insertions}`);
        console.info(`   Deletions: ${pullResult.summary.deletions}`);
      }
    } catch (error) {
      const gitError = error as GitError;
      console.error('Failed to pull repository:', gitError.message);
      throw new Error(`Repository pull failed: ${gitError.message}`);
    }
  }

  /**
   * Get the local path to the repository
   */
  public getRepoPath(): string {
    return this.repoPath;
  }

  /**
   * Check if the repository is currently syncing
   */
  public getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

/**
 * Create and configure the public models repository sync service
 *
 * @param baseDir - Base directory where the repository will be stored
 * @returns RepoSyncService instance configured for public models
 *
 * @remarks
 * This clones the sre-models-pub repository from GitHub into a local directory
 * named 'models' to decouple the local directory name from the repository name.
 */
export function createPubModelsSync(baseDir: string): RepoSyncService {
  return new RepoSyncService({
    baseDir,
    repoUrl: 'https://github.com/SmythOS/sre-models-pub',
    localDirName: 'models', // Local directory name (decoupled from repo name)
    syncInterval: 2 * 60 * 1000, // 2 minutes
  });
}
