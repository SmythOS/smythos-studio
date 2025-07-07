import { Command } from 'commander';
import { Configuration, OpenAIApi } from 'openai';
import fs from 'fs';
import util from 'util';
import { config } from '../config/config';
import path from 'path';

const constants = {
  SWAGGER_PATH: path.join(process.cwd(), 'docs/swagger.json'),
};

const configuration = new Configuration({
  apiKey: config.variables.openAiApiKey,
});

const openAiApi = new OpenAIApi(configuration);

const program = new Command();
program
  .option('-s, --service <path>', 'Service file path')
  .option('-c, --controller <path>', 'Controller file path')
  .option('-r, --route <path>', 'Route file path')
  .option('-v, --validation <path>', 'Validation file path')
  .parse(process.argv);

const options = program.opts();

const optionsKeys = Object.keys(options);
optionsKeys.forEach(key => {
  if (options[key]) {
    options[key] = path.join(process.cwd(), options[key]);
  }
});

const { service, controller, route, validation } = options;

if (!service || !controller || !route || !validation) {
  console.error('Please provide all file paths (service, controller, route)');
  process.exit(1);
}

async function run() {
  try {
    const [serviceContent, controllerContent, routeContent, validationContent] = await Promise.all([
      util.promisify(fs.readFile)(service, 'utf8'),
      util.promisify(fs.readFile)(controller, 'utf8'),
      util.promisify(fs.readFile)(route, 'utf8'),
      util.promisify(fs.readFile)(validation, 'utf8'),
    ]);
    console.log('Files read successfully');

    const swaggerContent = await util.promisify(fs.readFile)(constants.SWAGGER_PATH, 'utf8');
    const currentSwagger = JSON.parse(swaggerContent);

    const gptPrompt = `
      A Node.js app uses controllers, services, and routes to handle requests.
      Mainly, the controller is responsible for handling the request and the service is responsible for handling the business logic,
      so the controller will contain all request parameters/body/etc. and pass them to the service.
      Validations will let you know all the required fields and their types.

      **NOTE: the field "teamId" is not passed. It is fetched if the user is auth automatically.**

      Given the following files with their corresponding contents:

      Service file content:
      ${serviceContent}

      Controller file content:
      ${controllerContent}

      Route file content:
      ${routeContent}

      Validation file content:
      ${validationContent}

      And the existing swagger.json:
      ${JSON.stringify(currentSwagger, null, 2)}

      Create an updated swagger.json (don't delete existing paths, append to it) document in proper JSON format that includes information from the new service, controller, and route.
      You can create/update definitions, paths, or anything. Just try to make resuable components where possible. 


      Your output should be in JSON format only.

      Output:
    `;

    const gptResponse = await openAiApi.createChatCompletion(
      {
        model: 'gpt-4',
        messages: [
          {
            content: gptPrompt,
            role: 'user',
          },
        ],
      },
      {},
    );

    console.info('Generated new swagger.json. Saving...');

    if (!gptResponse?.data?.choices?.[0]?.message?.content) {
      console.error('No response from OpenAI API');
      process.exit(1);
    }

    let updatedSwagger: any;
    try {
      console.log(gptResponse?.data?.choices);
      updatedSwagger = JSON.parse(gptResponse?.data?.choices?.[0]?.message?.content);
    } catch (err) {
      console.error('Error parsing OpenAI response:', '');
      process.exit(1);
    }

    // Save updated swagger.json
    fs.writeFileSync(constants.SWAGGER_PATH, JSON.stringify(updatedSwagger, null, 2));

    console.log('swagger.json updated successfully');
  } catch (err) {
    // @ts-ignore
    console.error('Error occurred:', err.message);
  }
}

run();
