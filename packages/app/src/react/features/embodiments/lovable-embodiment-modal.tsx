import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useState } from 'react';
import { RiErrorWarningFill } from 'react-icons/ri';
import { Alert, AlertDescription } from '../../shared/components/ui/alert';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '../../shared/components/ui/collapsible';
import { Button } from '../../shared/components/ui/newDesign/button';
import ModalHeaderEmbodiment from './modal-header-embodiment';

interface LovableEmbodimentModalProps {
  onClose: () => void;
  workflowEndpoint?: {
    server: string;
    method: string;
    endpointName: string;
    fullUrl: string;
    description: string;
    responseFormat: string;
    exampleResponse: string;
    requiresAuth?: boolean;
    authType?: 'api_key' | 'bearer_token' | 'basic_auth';
    authHeaders?: string[];
  };
}

export default function LovableEmbodimentModal({
  onClose,
  workflowEndpoint = {
    server: 'https://cmdrhk9f2kwomjn6vfrclmvhc.agent.a.smyth.ai',
    method: 'GET',
    endpointName: 'get_cat_fact',
    fullUrl: 'https://cmdrhk9f2kwomjn6vfrclmvhc.agent.a.smyth.ai/api/get_cat_fact',
    description:
      'Use the below endpoint to retrieve a random cat fact. Send a GET request to the full URL. Parse the JSON response and extract the value of "cat_fact".',
    responseFormat: 'JSON',
    exampleResponse: '{"cat_fact": "<string containing a cat fact>"}',
    requiresAuth: true,
    authType: 'api_key',
    authHeaders: ['Authorization'],
  },
}: LovableEmbodimentModalProps) {
  const [step1Expanded, setStep1Expanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const instructionsText = `Instructions for Lovable agent:
${workflowEndpoint.description}

API Endpoint Details:
• Server: ${workflowEndpoint.server}
• Method: ${workflowEndpoint.method}
• Endpoint Name: ${workflowEndpoint.endpointName}
• Full URL: ${workflowEndpoint.fullUrl}
${
  workflowEndpoint.requiresAuth
    ? `
  Authentication Required:
  • Type: ${workflowEndpoint.authType?.toUpperCase()}
  • Headers: ${workflowEndpoint.authHeaders?.join(', ')}
  • Environment Variable: SMYTHOS_AGENTLLM_KEY`
    : ''
}
  
Response Format: ${workflowEndpoint.responseFormat}
${workflowEndpoint.exampleResponse}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(instructionsText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col gap-4 overflow-auto max-h-[90vh] max-w-[480px] md:max-w-[600px]">
        {/* Header with back and close buttons */}
        <ModalHeaderEmbodiment title="Integrate to Lovable" onBack={onClose} onClose={onClose} />

        <div className="">
          {/* Step 1 */}
          <div className="space-y-2">
            <Collapsible open={step1Expanded} onOpenChange={setStep1Expanded}>
              <CollapsibleTrigger className="flex items-center gap-2 text-left hover:bg-gray-50 p-2 rounded-md w-full">
                <span className="font-medium text-[#424242]">1. Open your Lovable project</span>
                {step1Expanded ? (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-auto" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 pt-2">
                <p className="text-sm text-muted-foreground">
                  Navigate to your Lovable project dashboard and open the project where you want to
                  integrate this SmythOS agent.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Step 2 */}
          <div className="space-y-3 p-2">
            <h3 className="font-medium text-[#424242]">
              2. Paste the text below into the Lovable chat.
            </h3>

            <div className="relative">
              <div className="bg-gray-50 border-[#d1d1d1] border border-solid rounded-lg p-6 font-mono text-sm whitespace-pre-wrap min-h-[400px] break-all">
                {instructionsText}
              </div>
              <Button
                handleClick={handleCopy}
                className="absolute top-3 right-3"
                variant={copySuccess ? 'primary' : 'secondary'}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Authentication Warning */}
          {workflowEndpoint.requiresAuth && (
            <div className="px-2">
              <Alert className="border-[#fee685] bg-[#fffbea] border-solid text-xs my-2">
                <AlertDescription className="text-[#973b00] block">
                  <span className="mr-2 inline-block w-fit align-text-bottom">
                    <RiErrorWarningFill className="h-4 w-4 text-[#fe9900]"></RiErrorWarningFill>
                  </span>
                  <span className="font-medium">Important:</span> This endpoint requires
                  authentication. Make sure to set your{' '}
                  <code className="bg-[#fef3c6] px-1 py-0.5 rounded font-mono">
                    SMYTHOS_AGENTLLM_KEY
                  </code>{' '}
                  environment variable in your Lovable project settings.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Copy Button */}
          <div className="flex justify-end px-2">
            <Button handleClick={handleCopy} className="px-8">
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}