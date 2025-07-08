import { GetFunctionCommand, InvokeCommand, Runtime } from '@aws-sdk/client-lambda';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import zipFolder from 'zip-folder';
import { LambdaClient, CreateFunctionCommand, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda';
import { CreateRoleCommand, GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';


async function deployServerlessCode({ agentId, componentId, code_imports, code_body, input_variables, awsConfigs }:
  {
    agentId: string, componentId: string, code_imports: string, code_body: string, input_variables: string[], awsConfigs: {
      region: string,
      accessKeyId: string,
      secretAccessKey: string
    }
  }): Promise<boolean> {
  const folderName = getLambdaFunctionName(agentId, componentId);
  const directory = `${process.cwd()}/lambda_archives/${folderName}`;
  console.log('Function Name: ', folderName);
  try {
    const libraries = extractNpmImports(code_imports);

    const lambdaCode = generateLambdaCode(code_imports, code_body, input_variables);
    // create folder
    fs.mkdirSync(directory);
    // create index.js file
    fs.writeFileSync(path.join(directory, 'index.mjs'), lambdaCode);
    // run command npm init
    execSync('npm init -y', { cwd: directory });
    // run command npm install
    execSync(`npm install ${libraries.join(' ')}`, { cwd: directory });

    const zipFilePath = await zipCode(directory);



    await updateCodeToLambda(folderName, zipFilePath, awsConfigs)
    console.log('Lambda function updated successfully!');
    return true;
  } catch (error) {
    console.log(error);
    return false;
  } finally {
    fs.rmSync(`${directory}`, { recursive: true, force: true });
    fs.unlinkSync(`${directory}.zip`);
  }
}

function getLambdaFunctionName(agentId: string, componentId: string) {
  return `${agentId}-${componentId}`;
}

function extractNpmImports(code_imports: string) {
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  const importRegex = /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;

  let libraries = new Set();

  // Match require statements
  let match;
  while ((match = requireRegex.exec(code_imports)) !== null) {

    libraries.add(match[1]);

  }

  // Match import statements
  while ((match = importRegex.exec(code_imports)) !== null) {
    libraries.add(match[1]);
  }

  return Array.from(libraries);
}

function generateLambdaCode(code_imports: string, code_body: string, input_variables: string[]) {
  const lambdaCode = `${code_imports}\nexport const handler = async (event, context) => {
    try {
      context.callbackWaitsForEmptyEventLoop = false;
     ${input_variables && input_variables.length ? input_variables.map((variable) => `const ${variable} = event.${variable};`).join('\n') : ''}
  \n${code_body}
    } catch (e) {
      throw e;
    }
   };`;
  return lambdaCode;
}

function zipCode(directory: string) {
  return new Promise((resolve, reject) => {
    zipFolder(`${directory}`, `${directory}.zip`, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(`${directory}.zip`);
      }
    });
  });
}


async function updateCodeToLambda(functionName, zipFilePath, awsConfigs) {
  try {
    // const layerArn = await createLambdaLayer(folderName);
    await createOrUpdateLambdaFunction(functionName, zipFilePath, awsConfigs);
  } catch (error) {
    console.error('Error creating Lambda function:', error);
    throw error;
  }
}

async function createOrUpdateLambdaFunction(functionName, zipFilePath, awsConfigs) {
  const client = new LambdaClient({
    region: awsConfigs.region,
    credentials: {
      accessKeyId: awsConfigs.accessKeyId,
      secretAccessKey: awsConfigs.secretAccessKey
    }
  });
  const functionContent = fs.readFileSync(zipFilePath);

  try {
    // Check if the function exists
    const getFunctionCommand = new GetFunctionCommand({ FunctionName: functionName })
    await client.send(getFunctionCommand)

    // Update function code if it exists
    const updateCodeParams = {
      FunctionName: functionName,
      ZipFile: functionContent,
    };
    const updateFunctionCodeCommand = new UpdateFunctionCodeCommand(updateCodeParams)
    await client.send(updateFunctionCodeCommand)
    // Update function configuration to attach layer
    await verifyFunctionDeploymentStatus(functionName, client)
    console.log('Lambda function code and configuration updated successfully!');
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      // Create function if it does not exist
      let roleArn = '';
      // check if the role exists
      try {
        const iamClient = new IAMClient({ region: awsConfigs.region, credentials: { accessKeyId: awsConfigs.accessKeyId, secretAccessKey: awsConfigs.secretAccessKey } });
        const getRoleCommand = new GetRoleCommand({ RoleName: `smyth-${functionName}-role` });
        const roleResponse = await iamClient.send(getRoleCommand);
        roleArn = roleResponse.Role.Arn;
      } catch (error) {
        if (error.name === 'NoSuchEntityException') {
          // create role
          const iamClient = new IAMClient({ region: awsConfigs.region, credentials: { accessKeyId: awsConfigs.accessKeyId, secretAccessKey: awsConfigs.secretAccessKey } });
          const createRoleCommand = new CreateRoleCommand({ RoleName: `smyth-${functionName}-role`, AssumeRolePolicyDocument: getLambdaRolePolicy() });
          const roleResponse = await iamClient.send(createRoleCommand);
          await waitForRoleDeploymentStatus(`smyth-${functionName}-role`, iamClient)
          roleArn = roleResponse.Role.Arn;
        }
      }

      const functionParams = {
        Code: { ZipFile: functionContent },
        FunctionName: functionName,
        Handler: 'index.handler',
        Role: roleArn,
        Runtime: Runtime.nodejs18x,
        Layers: [],
        Timeout: 900,
      };

      const functionCreateCommand = new CreateFunctionCommand(functionParams)
      const functionResponse = await client.send(functionCreateCommand)
      console.log('Function ARN:', functionResponse.FunctionArn);
    } else {
      throw error;
    }
  }
}

async function waitForRoleDeploymentStatus(roleName, client): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      let interval = setInterval(async () => {
        const getRoleCommand = new GetRoleCommand({ RoleName: roleName })
        const roleResponse = await client.send(getRoleCommand);
        if (roleResponse.Role.AssumeRolePolicyDocument) {
          clearInterval(interval)
          return resolve(true);
        }
      }, 7000);
    } catch (error) {
      console.log(error)
      return false;
    }
  })
}

async function verifyFunctionDeploymentStatus(functionName, client): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      let interval = setInterval(async () => {
        const getFunctionCommand = new GetFunctionCommand({ FunctionName: functionName })
        const lambdaResponse = await client.send(getFunctionCommand);

        if (lambdaResponse.Configuration.LastUpdateStatus === 'Successful') {
          clearInterval(interval)
          return resolve(true);
        }
      }, 5000);
    } catch (error) {
      console.log(error)
      return false;
    }
  })
}

async function getDeployedFunction(componentId: string, agentId: string, awsConfigs: {
  region: string,
  accessKeyId: string,
  secretAccessKey: string
}) {
  try {
    const client = new LambdaClient({
      region: awsConfigs.region,
      credentials: {
        accessKeyId: awsConfigs.accessKeyId,
        secretAccessKey: awsConfigs.secretAccessKey
    }
  });
    const getFunctionCommand = new GetFunctionCommand({ FunctionName: getLambdaFunctionName(agentId, componentId) })
    const lambdaResponse = await client.send(getFunctionCommand);
    return {
      status: lambdaResponse.Configuration.LastUpdateStatus,
      functionName: lambdaResponse.Configuration.FunctionName,
      functionVersion: lambdaResponse.Configuration.Version,
      updatedAt: lambdaResponse.Configuration.LastModified,
      role: lambdaResponse.Configuration.Role,
    };
  } catch (error) {
    return null;
  }
}

function getLambdaRolePolicy() {
  return JSON.stringify(
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "lambda.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    })
}

export const serverlessCodeHelper = {
  deployServerlessCode,
  getDeployedFunction
};
