import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';

function getLambdaFunctionName(agentId: string, componentId: string) {
  return `${agentId}-${componentId}`;
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

export const serverlessCodeHelper = {
  getDeployedFunction
};
