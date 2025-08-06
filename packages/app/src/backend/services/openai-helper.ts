import { Configuration, OpenAIApi } from 'openai';
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
