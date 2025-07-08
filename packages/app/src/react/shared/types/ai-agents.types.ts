export interface ChatMessage {
  id: number;
  type: string;
  content: any;
  isTyped?: boolean;
  updatedAt: number;
  title?: string;
  function?: string;
  parameters?: string[];
  isInvoked?: boolean;
}

export interface Conversation {
  id: string;
  lastModified: Date;
}

export interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  last7Days: Conversation[];
  last30Days: Conversation[];
  byMonth: {
    [key: string]: Conversation[];
  };
}

export interface ConversationCache {
  [id: string]: any;
}
