import * as fal from '@fal-ai/serverless-client';

import config from '../config';
import {
  AGENT_AVATAR_AUTO_GENERATE_IMAGE_HEIGHT,
  AGENT_AVATAR_AUTO_GENERATE_IMAGE_WIDTH,
} from '../constants';
import { generateLinkedInAvatarPrompt } from '../../shared/constants/prompts';
import SmythPubStaticStorage from './storage/SmythStaticStorage.class';
import { randomUUID } from 'crypto';
import { authHeaders, includeAxiosAuth, smythAPIReq } from '../utils';
const staticStorage = new SmythPubStaticStorage();

export async function generateImage({
  prompt,
  model = 'fal-ai/flux-realism',
}: {
  prompt: string;
  model?: string;
}) {
  fal.config({
    credentials: config.env.FALAI_API_KEY,
  });

  const result: any = await fal.subscribe(model, {
    input: {
      prompt,
      image_size: {
        width: AGENT_AVATAR_AUTO_GENERATE_IMAGE_WIDTH,
        height: AGENT_AVATAR_AUTO_GENERATE_IMAGE_HEIGHT,
      },
    },
  });

  // Check if the result contains the expected image data
  if (!result.images || result.images.length === 0) {
    throw new Error('No image generated from fal.ai');
  }

  // Extract the image URL from the result
  const imageUrl: string = result.images[0].url;

  // Fetch the image data from the URL
  const response: Response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${imageUrl}: ${response.statusText}`);
  }

  // Convert the image data to a buffer
  const arrayBuffer: ArrayBuffer = await response.arrayBuffer();
  const buffer: Buffer = Buffer.from(arrayBuffer);

  // Convert the buffer to base64
  const base64Image: string = buffer.toString('base64');

  // Validate the base64 string
  if (base64Image.trim() === '') {
    throw new Error('Invalid base64 image data generated');
  }

  // Return the base64 image data
  return base64Image;
}

export async function autoGenerateAvatarForAgent(req, agentId: string, teamId: string) {
  const base64Image: string = await generateImage({
    prompt: generateLinkedInAvatarPrompt(),
  });

  const avatarStoragePath = SmythPubStaticStorage.path(
    'teams',
    SmythPubStaticStorage.hash(teamId),
    `avatar-${randomUUID()}`,
  );
  const uploaded = await staticStorage.saveContent({
    key: avatarStoragePath,
    contentType: 'image/png',
    body: Buffer.from(base64Image, 'base64'),
    skipAclCheck: true,
  });

  if (!uploaded.success) {
    throw new Error('Failed to upload avatar to static storage');
  }

  const publicUrl = uploaded.url;

  // save the avatar in the agent settings
  await smythAPIReq.put(
    `/ai-agent/${agentId}/settings`,
    {
      key: 'avatar',
      value: publicUrl,
    },
    await authHeaders(req),
  );

  return publicUrl;
}
