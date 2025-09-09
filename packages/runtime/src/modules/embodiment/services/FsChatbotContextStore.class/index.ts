import fs from 'fs';
import path from 'path';

import type { ILLMContextStore } from '@smythos/sre';

import { EStorageTypes } from '@embodiment/types/fileStorage.types';
import { fsExists } from '@embodiment/utils/general.utils';

import { FsChatbotContextExporter } from './FsChatbotContextExporter.class';

export class FsChatbotContextStore implements ILLMContextStore {
  private agentId: string;
  private conversationID: string;
  private dataFolder: string;
  // TODO: "exporter" should be declared in the ILLMContextStore interface and exporter should also implement a known interface
  public exporter: FsChatbotContextExporter;
  storageType = EStorageTypes.Local;
  private sessionsPath: string;

  constructor({ agentId, conversationID, dataPath }: { agentId: string; conversationID: string; dataPath?: string }) {
    if (!dataPath) {
      throw new Error('dataPath is required.');
    }

    if (!fs.existsSync(dataPath)) {
      throw new Error(`The data folder at ${dataPath} does not exist.`);
    }

    this.dataFolder = dataPath;
    this.agentId = agentId;
    this.conversationID = conversationID;
    this.sessionsPath = path.join(dataPath, 'chat_sessions');
    this.exporter = new FsChatbotContextExporter({
      sessionsPath: this.sessionsPath,
      agentId,
    });
  }

  public async save(messages: any[]): Promise<void> {
    try {
      const filePath = this.getConversationFilePath(this.agentId, this.conversationID);
      await this.ensureDirectoryExistence(filePath);
      await fs.promises.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf-8');
    } catch (error) {
      // Saving is not critical, so we can simply log the error and continue without interrupting the process.
      console.warn('Error saving Conversation: ', error);
    }
  }
  public async load(count?: number): Promise<any[]> {
    const conversations = await this.getConversationById(this.agentId, this.conversationID);

    if (count === undefined) return conversations;

    if (typeof count === 'number' && count > 0) {
      return conversations.slice(-count);
    }
  }

  public async getMessage(_messageId: string): Promise<any> {
    return {};
  }

  private async getConversationById(agentId: string, conversationId: string): Promise<Record<string, any>[]> {
    const folderPath = path.join(this.sessionsPath, agentId);

    if (!(await fsExists(folderPath))) {
      return [];
    }

    const filePath = path.join(folderPath, `${conversationId}.json`);

    if (!(await fsExists(filePath))) {
      return [];
    }

    try {
      const fileContent = await fs.promises.readFile(filePath, {
        encoding: 'utf8',
      });
      return JSON.parse(fileContent);
    } catch (error) {
      return [];
    }
  }

  private getConversationFilePath(agentId: string, conversationID: string): string {
    return path.join(this.sessionsPath, agentId, `${conversationID}.json`);
  }

  private async ensureDirectoryExistence(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (await fsExists(dir)) {
      return;
    }
    await fs.promises.mkdir(dir, { recursive: true });
  }
}
