import * as fs from "fs";
import path from "path";

import * as chatUtils from "@embodiment/utils/chat.utils";
import { fsExists } from "@embodiment/utils/general.utils";

export type ConversationStreamYield = {
  stream: fs.ReadStream;
  convId: string;
};

export class FsChatbotContextExporter {
  private sessionsPath: string;
  private agentId: string;

  constructor({
    sessionsPath,
    agentId,
  }: {
    sessionsPath: string;
    agentId: string;
  }) {
    this.sessionsPath = sessionsPath;
    this.agentId = agentId;
  }

  /**
   * Export all conversations as a JSON stream
   * @param param0
   * @returns
   */
  public async *streamConversations({
    dateRange,
    env,
  }: {
    dateRange?: string;
    env?: chatUtils.ChatConversationsEnv;
  }): AsyncGenerator<ConversationStreamYield> {
    // TODO covert to stream-based export. will implement it NOW
    const folderPath = path.join(this.sessionsPath, this.agentId);
    const testConvprefix = chatUtils.CHAT_PREFIXES["test"];
    const prodConvprefix = chatUtils.CHAT_PREFIXES["prod"];

    // check if the folder exists
    if (!(await fsExists(folderPath))) return;

    const conversations = await fs.promises.readdir(folderPath);
    const filteredConversations = conversations.filter((conversation) => {
      // first, filter out by prefix env
      if (
        env === "test"
          ? !conversation.startsWith(testConvprefix)
          : conversation.startsWith(testConvprefix) ||
            !conversation.startsWith(prodConvprefix)
      )
        return false;
      if (!conversation.endsWith(".json")) return false;

      // then, filter out by date range
      if (dateRange && chatUtils.isValidDateRange(dateRange)) {
        const conversationDate = chatUtils
          .parseDateFromConvId(conversation)
          .getTime();
        const { start, end } = chatUtils.parseDateRange(dateRange);
        if (conversationDate < start || conversationDate > end) return false;
      }

      return true;
    });

    for (const file of filteredConversations) {
      const fullPath = path.join(this.sessionsPath, this.agentId, file);
      yield {
        stream: fs.createReadStream(fullPath, { encoding: "utf8" }),
        convId: file.replace(".json", ""),
      };
    }
  }
}
