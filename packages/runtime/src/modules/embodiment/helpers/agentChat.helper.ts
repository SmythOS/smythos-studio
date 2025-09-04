import { getM2MToken } from '@/core/helpers/logto.helper';
import { includeAuth, mwSysAPI } from '@core/services/smythAPIReq';
import { IMetadataFile } from '../types/chat.types';

export async function updateConversation({ data, conversationId }: { conversationId: string; data: IMetadataFile }) {
    const token = (await getM2MToken('https://api.smyth.ai')) as string;
    const response = await mwSysAPI
        .put(
            `/chats/${conversationId}`,
            {
                conversation: {
                    label: data.label,
                    summary: data.summary,
                    chunkSize: data.chunkSize,
                    lastChunkID: data.lastChunkId?.toString(),
                },
            },
            includeAuth(token),
        )
        .catch((error) => {
            console.error('Error updating conversation', error);
            return null;
        });

    return response?.status === 200;
}
