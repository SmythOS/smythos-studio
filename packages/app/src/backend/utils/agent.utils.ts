import { chatRequest } from '../services/openai-helper';
import { format } from 'date-fns';
import { getUserTimezoneDate } from './general.utils';

export async function getAgentShortDescription(data, userName) {
  if (data?.components?.length > 0) {
    try {
      return await generateAgentDescription(data.components);
    } catch (error) {
      console.error(error);
    }
  }
  return '';
  /**
   * if data.shortDescription is not provided, we will generate it by using user name
   * Example: "Ingrid Wu's Agent - July 19, 2024 10:50 AM" <- replace with username and current date
   */

  return `${userName}'s Agent - ${format(
    new Date(getUserTimezoneDate()),
    'MMMM dd, yyyy hh:mm a',
  )}`;
}

export async function generateAgentDescription(components) {
  // Format the components list for the prompt
  const formattedComponents = components.map((component) => ({
    name: component.name,
    title: component.title,
    description: component.data.description || '',
    method: component.data.method || '',
  }));

  try {
    const data = await chatRequest('', {
      model: 'gpt-4o-mini',
      max_tokens: 100,
      messages: [
        {
          role: 'system',
          content: `You are an LLM Agent Description generator.
                    The user will provide you with a list of components used in the agent, and you should return a relevant description of maximum 1 to 1.5 lines that describes the agent.
                    The description should be based on the provided components details and should be in the similar tone and wording as mentioned in the example below:
                    "A versatile agent that extracts text from URLs, seamlessly connects to APIs, processes responses, and provides clear instructions for API key management."
                    Use a similar style for generating descriptions.
                    VERY IMPORTANT: The description should be concise and clear.
                    Here are the components details:
                    \`\`\`json
                    ${JSON.stringify(formattedComponents, null, 2)}
                    \`\`\``,
        },
      ],
    });

    // If data is a string, remove the double quotes at the start and end
    return typeof data === 'string' ? data.replace(/^"|"$/g, '') : data;
  } catch (error) {
    // If there is an error just return the empty string
    console.log(error.message);
    return '';
  }
}
