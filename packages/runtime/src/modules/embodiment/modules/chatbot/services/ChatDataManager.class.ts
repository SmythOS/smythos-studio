import { IChatMessage, IChatStorage, IMetadataFile } from '@core/types/chat.types';

/*
  ChatDataManager takes care of storing the chat data into chunks of 100 messages in a file
  when the file is full, it creates a new file and stores the next 100 messages in that file
  each messages is a json object and each file is a json array of messages.
*/

type ChunkFile = IChatMessage[];

// all the props that should not be counted in the context window and should not be sent to LLMs
const nonRequiredMessageProps = ['timestamp'];

export class ChatDataManager {
    teamId: string;
    userId: string;
    agentId: string;
    storage: IChatStorage;
    chunkIndex: number = 0;
    conversationId: string;
    maxChunks: number = 100;
    metaUpdateCallback: (metadata: IMetadataFile) => void = () => {};
    private metaDataFilename = 'metadata.json';

    constructor({
        storage,
        teamId,
        userId,
        agentId,
        conversationId,
        metaUpdateCallback,
    }: {
        teamId: string;
        userId: string;
        agentId: string;
        storage: IChatStorage;
        conversationId: string;
        metaUpdateCallback?: (metadata: IMetadataFile) => void;
    }) {
        this.storage = storage;
        this.teamId = teamId;
        this.userId = userId;
        this.agentId = agentId;
        this.conversationId = conversationId;
        this.metaUpdateCallback = metaUpdateCallback || this.metaUpdateCallback;

        if (!this.teamId || !this.userId || !this.agentId || !this.conversationId) {
            throw new Error('teamId, userId, agentId and conversationId are required');
        }

        this.storage.setParams({ teamId, userId, agentId, conversationId });
    }

    async initManager() {
        const metaData = await this.getMetaData();
        console.log('initManager', metaData);

        if (metaData) {
            this.chunkIndex = metaData.lastChunkId || 0;
        }
        return this; // to allow chaining
    }

    getChunkFileName(chunkId?: number): string {
        return `chunk_${chunkId || this.chunkIndex}.json`;
    }

    async storeMetaData(metaData: IMetadataFile) {
        await this.storage.write(this.metaDataFilename, JSON.stringify(metaData), {});
        return this.metaUpdateCallback(metaData);
    }

    async initConversation(metaData: IMetadataFile) {
        return this.storeMetaData(metaData);
    }

    async getMetaData(): Promise<IMetadataFile> {
        const defaultMetaData: IMetadataFile = {
            label: 'chat',
            summary: 'chat',
            teamId: this.teamId,
            agentId: this.agentId,
            id: this.conversationId,
            chunkSize: this.maxChunks,
            lastChunkId: this.chunkIndex,
        };

        if (!(await this.storage.exists(this.metaDataFilename))) {
            return defaultMetaData;
        }

        const metaData = await this.storage.read(this.metaDataFilename);
        return metaData ? JSON.parse(metaData) : defaultMetaData;
    }

    async getChunkFile(chunkIndex: number, createIfNeeded?: boolean): Promise<ChunkFile> {
        const chunkFileName = this.getChunkFileName(chunkIndex);
        if (!(await this.storage.exists(chunkFileName))) {
            if (createIfNeeded) {
                this.storage.write(chunkFileName, JSON.stringify([]), {});
            }
            return [];
        }

        const chunkFileContents = (await this.storage.read(chunkFileName)) ?? '';
        const chunkFile: ChunkFile = JSON.parse(chunkFileContents);
        return chunkFile;
    }

    async getLatestChunkFile(createIfNeeded?: boolean): Promise<ChunkFile> {
        return this.getChunkFile(this.chunkIndex, createIfNeeded);
    }

    async getNextChunkFile(current: number): Promise<ChunkFile> {
        const index = current + 1;
        return this.getChunkFile(index);
    }

    async getPrevChunkFile(current: number): Promise<ChunkFile> {
        const index = Math.max(current - 1, 0);
        return this.getChunkFile(index);
    }

    // It returns at least min messages but not more than max.
    async getLatestMessages(min: number = 20, max: number = 100): Promise<IChatMessage[]> {
        const metaData = await this.getMetaData();
        const currentChunkIndex = metaData.lastChunkId;
        const messages: IChatMessage[] = [];
        let totalMessages = 0;
        let i = currentChunkIndex;

        while (totalMessages < max && i >= 0) {
            const chunk = await this.getChunkFile(i);
            if (chunk.length === 0) {
                break; // Stop reading chunks if we encounter an empty chunk = non-existent chunk file
            }
            const remainingMessages = max - totalMessages;
            const chunkMessages = chunk.slice(-remainingMessages);
            messages.unshift(...chunkMessages);
            totalMessages += chunkMessages.length;
            i--;
        }

        return messages.slice(-min);
    }

    // #region TODO
    // Reuse getLatestMessages
    async getPaginatedMessages(page: number, limit: number): Promise<IChatMessage[]> {
        const metaData = await this.getMetaData();
        const currentChunkIndex = metaData.lastChunkId;
        const messages: IChatMessage[] = [];
        let totalMessages = 0;
        let i = currentChunkIndex;
        const messagesNeeded = page * limit;

        while (totalMessages < messagesNeeded && i >= 0) {
            const chunk = await this.getChunkFile(i);
            if (!chunk || chunk.length === 0) {
                break; // Stop reading chunks if we encounter an empty or non-existent chunk file
            }

            // Prepend messages from the current chunk
            messages.unshift(...chunk);

            // Update total messages read
            totalMessages += chunk.length;

            // Decrement the chunk index
            i--;
        }

        // Ensure that we have enough messages to paginate properly
        const totalPages = Math.ceil(totalMessages / limit);
        const validPage = Math.min(page, totalPages);

        // Calculate start index for slicing messages array based on requested page and limit
        const startIndex = (validPage - 1) * limit;
        const endIndex = startIndex + limit;

        // Slice the desired page of messages
        const paginatedMessages = messages
            .reverse() // Reverse the order of messages to get the latest messages first
            .slice(startIndex, endIndex) // Slice the messages array to get the desired page
            .reverse(); // Reverse the order of messages again to get the original order

        console.log('returning paginated messages', paginatedMessages.length, paginatedMessages);
        return paginatedMessages;
    }

    saveChunkFile(chunks: ChunkFile): Promise<void> {
        const chunkFileName = this.getChunkFileName();
        console.log('saveChunkFile', chunkFileName, chunks);
        return this.storage.write(chunkFileName, JSON.stringify(chunks), {});
    }

    async pushMessage(message: IChatMessage, enforceUnique: boolean = false): Promise<void> {
        console.log('pushing message', message);
        const newMessage = { ...message, timestamp: Date.now() };

        let chunkFile = await this.getLatestChunkFile(true);
        const metaData = await this.getMetaData();

        // Check if the most recent message matches the role and content of the new message
        if (enforceUnique && chunkFile.length > 0) {
            const mostRecentMessage = chunkFile[chunkFile.length - 1];
            if (mostRecentMessage.role === newMessage.role && mostRecentMessage.content === newMessage.content) {
                console.log('Message already exists. Skipping...');
                return; // Return early if the message already exists
            }
        }

        if (chunkFile.length >= this.maxChunks) {
            this.chunkIndex++;

            if (metaData) {
                metaData.lastChunkId = this.chunkIndex;
                this.storeMetaData(metaData);
            }

            chunkFile = []; // to only store current message in the new file
        }

        chunkFile.push(newMessage);
        return this.saveChunkFile(chunkFile);
    }

    private removeOptionalProps(message: IChatMessage): IChatMessage {
        const newMessage = { ...message };
        nonRequiredMessageProps.forEach((prop) => {
            delete newMessage[prop];
        });
        return newMessage;
    }

    async getContextMessages(tokenWindow: number): Promise<IChatMessage[]> {
        const maxContentLength = tokenWindow * 1.5; // characters in the window
        const metaData = await this.getMetaData();
        const currentChunkIndex = metaData.lastChunkId;
        const messages: ChunkFile = [];
        let totalContentLength = 0;
        let i = currentChunkIndex;

        while (totalContentLength < maxContentLength && i >= 0) {
            const prevChunk = await this.getChunkFile(i);
            if (prevChunk.length === 0) {
                break; // Stop reading chunks if we encounter an empty chunk = non-existent chunk file
            }
            messages.unshift(...prevChunk.map((msg) => this.removeOptionalProps(msg)));
            totalContentLength += (JSON.stringify(prevChunk).length - prevChunk.length * 33) / 4; // approximating the token length
            i--;
        }

        return messages;
    }
}
