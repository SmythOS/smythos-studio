import { Readable } from 'stream';
import { HeadObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';

import config from '@embodiment/config';
import { Metadata } from '../../../types';
import S3Storage from '../S3Storage.class';
import { stream2buffer } from '../../utils';

type Metadata = {
    [key: string]: string;
};

type AclRules = Metadata;

// TODO: This file has code redundancy with SmythStorage.class.ts
// It was needed at the time of implementation
// Refactor to remove redundancy

export class SmythChatStorage extends S3Storage {
    teamId: string = '';
    userId: string = '';
    agentId: string = '';
    conversationId: string = '';

    constructor() {
        super(config.env.AWS_S3_BUCKET_NAME || '');
    }

    setParams({ teamId, userId, agentId, conversationId }: { teamId: string; userId: string; agentId: string; conversationId: string }) {
        this.teamId = teamId;
        this.userId = userId;
        this.agentId = agentId;
        this.conversationId = conversationId;

        if (!this.teamId || !this.userId || !this.agentId || !this.conversationId) {
            throw new Error('teamId, userId, agentId and conversationId are required');
        }
    }

    private getPrefixedKey(key: string): string {
        const preFixed = `teams/${this.teamId}/conv/${this.conversationId}/${key}`;
        console.log('prefixed', preFixed);
        return preFixed;
    }

    private async hasAccess(key: string, aclRules: AclRules): Promise<boolean> {
        const metadata = await super.getMetadata(key);

        if (!metadata?.teamid || !metadata?.userid) return false;
        return metadata?.teamid === aclRules?.teamid && metadata?.userid === aclRules?.userid;
    }

    public async exists(key: string): Promise<boolean> {
        try {
            await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: this.getPrefixedKey(key),
                })
            );
            return true; // If the command succeeds, the file exists
        } catch (error: any) {
            if (error.name === 'NotFound' || error.$metadata.httpStatusCode === 404) {
                return false; // The file does not exist
            }
            // Log and rethrow any other error to handle it upstream
            console.log(`Error checking existence of object with key ${key}: `, error);
            throw error;
        }
    }

    public async saveContent({
        name,
        body,
        metadata,
        contentType,
    }: {
        body: any;
        name: string;
        contentType?: string;
        metadata: Metadata & Record<string, string>;
    }): Promise<any> {
        if (!metadata || !metadata?.teamid || !metadata?.userid) {
            throw new Error('Metadata is required with `teamid` and `userid`');
        }

        const otherParams: Partial<PutObjectCommandInput> = {
            Metadata: metadata,
        };

        if (contentType) otherParams.ContentType = contentType;
        return await super.putObject(name, body, otherParams);
    }

    public async getContent(
        key: string,
        aclRules: AclRules
    ): Promise<{ data: Buffer | Readable | undefined; lastModified: Date | undefined; contentType: string | undefined }> {
        if (aclRules && Object.keys(aclRules)) {
            if (!aclRules?.teamid || !aclRules?.userid) {
                throw new Error('ACL Rules is required with `teamid` and `userid`');
            }

            if (!(await this.hasAccess(key, aclRules))) {
                throw new Error('Access denied');
            }
        }

        const response = await super.getObject(key);
        const body = response?.Body;

        if (body && body instanceof Readable) {
            return {
                data: await stream2buffer(body),
                lastModified: response?.LastModified,
                contentType: response?.ContentType,
            };
        }

        throw new Error('getContent: Invalid response from file storage. response type:' + typeof body);
    }

    public async read(filename: string) {
        const content = await this.getContent(this.getPrefixedKey(filename), {
            teamid: this.teamId,
            agentid: this.agentId,
            userid: this.userId,
        }).catch((error) => {
            console.error('Error reading file:', error);
            return null;
        });
        return content?.data?.toString() || null;
    }

    public async write(filename: string, data: string, metadata: Record<any, any> = {}) {
        return this.saveContent({
            body: data,
            name: this.getPrefixedKey(filename),
            metadata: { teamid: this.teamId, agentid: this.agentId, userid: this.userId, ...metadata },
        }).catch((error) => {
            console.error('Error writing file:', error);
            return null;
        });
    }

    public async delete(filename: string) {
        return super.deleteObject(filename);
    }
}
