import axios from 'axios';
import {
  Configuration,
  CreateImageRequestResponseFormatEnum,
  CreateImageRequestSizeEnum,
  OpenAIApi,
} from 'openai';
import config from '../config';

const configuration = new Configuration({
  apiKey: config.env.OPENAI_API_KEY,
});

const openAiApi = new OpenAIApi(configuration);

export async function chatRequest(prompt, params: any = {}) {
  if (!params.model) params.model = 'gpt-4o-mini'; //force gpt-4o-mini
  if (!params.messages) params.messages = [];

  if (params.messages.length === 1) {
    params.messages.push({ role: 'user', content: prompt });
  }
  delete params.prompt;
  //console.log('OpenAI params', params);

  const response: any = await openAiApi.createChatCompletion(params);

  const data = response?.data?.choices?.[0]?.text || response?.data?.choices?.[0]?.message.content;

  return data;
}

export async function generateImage({
  n = 1,
  prompt,
  size = '1024x1024', // Dall-E 3 model requires 1024x1024
  model = 'dall-e-3',
  response_format = 'b64_json',
}: {
  n?: number;
  prompt: string;
  model?: string;
  size?: CreateImageRequestSizeEnum;
  response_format?: CreateImageRequestResponseFormatEnum;
}) {
  const response = await openAiApi.createImage({
    n,
    size,
    prompt,
    // TODO: update OpenAI SDK with updated types
    // @ts-ignore
    model,
    style: 'natural',
    response_format,
  });

  const resultKey = response_format === 'url' ? 'url' : 'b64_json';
  return response?.data?.data?.[0]?.[resultKey];
}
