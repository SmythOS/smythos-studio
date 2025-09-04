import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useRef, useState } from 'react';
import { CopyKeyIcon, DeleteKeyIcon, InfoIcon } from '../../shared/components/svgs';
import { Input } from '../../shared/components/ui/input';
import { Button } from '../../shared/components/ui/newDesign/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/components/ui/select';
import { Spinner } from '../../shared/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/components/ui/tabs';
import { Textarea } from '../../shared/components/ui/textarea';
import type { Agent } from '../agents/types/agents.types';
import ModalHeaderEmbodiment from './modal-header-embodiment';

/**
 * Supported code languages for code samples.
 */
type CodeLanguage = 'nodejs' | 'python' | 'curl' | 'json';

/**
 * API Key type for LLM integration.
 */
interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

/**
 * Props for the LLM Embodiment Modal.
 */
interface LlmEmbodimentModalProps {
  agent: Agent;
  defaultTab?: 'code' | 'keys';
  onClose: () => void;
}

/**
 * Generates code samples for different languages.
 */
function generateCodeSamples(
  baseUrl: string,
  agentId: string,
  apiKey: string,
  version: string,
): Record<CodeLanguage, { code: string; language: string }> {
  const modelId = `${agentId}@${version}`;
  const apiKeyValue = apiKey ? `'${apiKey}'` : 'process.env.SMYTHOS_AGENTLLM_KEY';
  return {
    nodejs: {
      language: 'javascript',
      code: `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: ${apiKeyValue},
  baseURL: '${baseUrl}/_openai/v1',
});

const response = await openai.chat.completions.create({
  model: '${modelId}',
  messages: [{ role: 'user', content: 'Hello, what can you do?' }],
  stream: false,
});

console.log(response?.choices);`,
    },
    python: {
      language: 'python',
      code: `from openai import OpenAI
client = OpenAI(
  api_key=${apiKey ? `'${apiKey}'` : 'os.getenv("SMYTHOS_AGENTLLM_KEY")'},
  base_url='${baseUrl}/_openai/v1'
)

response = client.chat.completions.create(
  model='${modelId}',
  messages=[{"role": "user", "content": "Hello, what can you do?"}],
)

print(response.choices)`,
    },
    curl: {
      language: 'bash',
      code: `curl ${baseUrl}/_openai/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ${apiKey || '$SMYTHOS_AGENTLLM_KEY'}' \
  -d '{
  "model": "${modelId}",
  "messages": [{
    "role": "user",
    "content": "Hello, what can you do?"
  }]
}'`,
    },
    json: {
      language: 'json',
      code: `{
  "model": "${modelId}",
  "messages": [{
    "role": "user",
    "content": "Hello, what can you do?"
  }]
}`,
    },
  };
}

/**
 * Fetch API keys for the agent (React Query fetcher).
 */
const fetchAgentKeys = async (agentId: string): Promise<ApiKey[]> => {
  const res = await fetch(`/api/page/builder/${agentId}/keys/agent-llm`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await res.json();
  if (result && result.data) {
    return Object.entries(result.data).map(([id, keyData]: [string, any]) => ({
      id,
      name: keyData.name,
      key: keyData.key,
      createdAt: keyData.metadata?.created_time
        ? new Date(keyData.metadata.created_time).toLocaleString('en-US', {
            month: 'long',
            year: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
          })
        : 'Unknown date',
    }));
  }
  return [];
};

// Define color constants for icon hover
const COPY_ICON_COLOR = '#707070';
const COPY_ICON_HOVER = '#222';
const DELETE_ICON_COLOR = '#707070';
const DELETE_ICON_HOVER = '#C50F1F';

/**
 * LLM Embodiment Modal component for OpenAI-compatible agent integration.
 */
const LlmEmbodimentModal: React.FC<LlmEmbodimentModalProps> = ({
  agent,
  defaultTab = 'code',
  onClose,
}) => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'code' | 'keys' | 'create-key'>(defaultTab);
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('nodejs');
  const [selectedVersion, setSelectedVersion] = useState<string>('dev');
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [createKeyName, setCreateKeyName] = useState<string>('');
  const [createKeyValue, setCreateKeyValue] = useState<string>('');
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);
  const [isRevokingKey, setIsRevokingKey] = useState<string>('');
  const codeRef = useRef<HTMLTextAreaElement>(null);

  // --- Constants ---
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://llm.emb.smyth.ai'
      : 'https://llm.emb-stg.smyth.ai';
  const agentId = agent.id;
  const queryClient = useQueryClient();

  // --- React Query: Fetch API Keys ---
  const {
    data: apiKeys = [],
    isLoading: isLoadingKeys,
    refetch: refetchKeys,
  } = useQuery<ApiKey[]>(['agent-llm-keys', agentId], () => fetchAgentKeys(agentId), {
    enabled: activeTab === 'keys' || activeTab === 'code',
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // --- React Query: Create Key Mutation ---
  const createKeyMutation = useMutation({
    mutationFn: async (keyName: string) => {
      setIsCreatingKey(true);
      const response = await fetch(`/api/page/builder/${agentId}/keys/agent-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyName: keyName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the keys query
      queryClient.invalidateQueries(['agent-llm-keys', agentId]);
      setCreateKeyName('');
      setActiveTab('keys');
    },
    onError: (error) => {
      console.error('Error creating API key:', error);
    },
    onSettled: () => setIsCreatingKey(false),
  });

  // --- React Query: Revoke Key Mutation ---
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      setIsRevokingKey(keyId);
      const response = await fetch(`/api/page/builder/${agentId}/keys/agent-llm/${keyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke API key');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the keys query
      queryClient.invalidateQueries(['agent-llm-keys', agentId]);
    },
    onError: (error) => {
      console.error('Error revoking API key:', error);
    },
    onSettled: () => setIsRevokingKey(''),
  });

  // --- Handlers ---
  const handleCreateKey = async () => {
    if (!createKeyName.trim()) return;
    createKeyMutation.mutate(createKeyName.trim());
  };

  const handleRevokeKey = async (keyId: string) => {
    revokeKeyMutation.mutate(keyId);
  };

  /**
   * Handles copying the code sample to clipboard.
   */
  const handleCopyCode = async () => {
    if (codeRef.current) {
      await navigator.clipboard.writeText(codeRef.current.value);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 3000);
    }
  };

  /**
   * Handles switching to the Create Key modal.
   */
  const handleOpenCreateKey = () => {
    setActiveTab('create-key');
    setCreateKeyName('');
  };

  /**
   * Handles switching to the Keys tab.
   */
  const handleOpenKeysTab = () => {
    setActiveTab('keys');
  };

  /**
   * Handles switching to the Code tab.
   */
  const handleOpenCodeTab = () => {
    setActiveTab('code');
  };

  // --- Version Options ---
  const versionOptions = [
    { value: 'dev', label: 'Dev (Current)' },
    { value: 'prod', label: 'Prod' },
  ];

  // --- Code Sample ---
  const codeSamples = generateCodeSamples(baseUrl, agentId, selectedApiKey, selectedVersion);
  const codeSample = codeSamples[selectedLanguage];

  // --- UI/UX Fixes ---
  // Tabs styling
  const tabButtonBase =
    'flex-1 py-2 text-base font-medium rounded-t-lg transition-colors duration-150';
  const tabActive = 'bg-white text-[#222] shadow-sm';
  const tabInactive = 'bg-[#F5F6F7] text-[#888]';

  // Dropdown styling (2px border on focus)
  const selectTriggerClass =
    'h-10 bg-white border border-b-2 border-b-[#E5E7EB] focus:border-b-2 focus:border-b-blue-600 focus:outline-none focus:shadow-none text-base px-0 rounded shadow-none text-sm px-2';

  // Helper function to handle tab changes
  const handleTabChange = (tab: 'code' | 'keys' | 'create-key') => {
    setActiveTab(tab);
  };

  // --- Dynamic Title Based on Active Tab ---
  const getModalTitle = () => {
    if (activeTab === 'create-key') {
      return (
        <span className="block text-2xl font-semibold leading-tight text-[#222] text-left">
          Create a new key
        </span>
      );
    }
    return (
      <span className="block text-lg font-semibold leading-tight text-[#222] text-left">
        Integrating Agent as an
        <br />
        OpenAI-Compatible LLM
      </span>
    );
  };

  // --- Render ---
  return (
    <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col gap-4 overflow-auto max-h-[90vh] max-w-[480px]">
      {/* Header with back and close buttons */}
      <ModalHeaderEmbodiment
        title={getModalTitle()}
        onBack={activeTab === 'create-key' ? handleOpenKeysTab : onClose}
        onClose={onClose}
      />
      {/* Use these keys to authenticate... (below title, above tabs) */}
      {activeTab === 'keys' && (
        <div className="mb-2">
          <span className="text-sm text-[#222]">
            Use these keys to authenticate your API requests
          </span>
        </div>
      )}
      {/* Tabs navigation using shared UI components */}
      <Tabs
        value={activeTab}
        onValueChange={(v: string) => handleTabChange(v as 'code' | 'keys' | 'create-key')}
        className="w-full"
      >
        {activeTab !== 'create-key' && (
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="code" className="text-sm rounded-sm">
              Code
            </TabsTrigger>
            <TabsTrigger value="keys" className="text-sm rounded-sm">
              Keys
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="code" className="space-y-4">
          {/* Add API key text and dropdown */}
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium text-[#222]">
              Add API key below to your environment or CI pipeline.
            </span>
            {/* API Key Dropdown with custom chevron icon */}
            <div className="w-full">
              <Select
                value={selectedApiKey === '' ? '__none__' : selectedApiKey}
                onValueChange={(v) => setSelectedApiKey(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className={selectTriggerClass} aria-label="API Key">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent onClick={(e) => e.stopPropagation()}>
                  <SelectItem value="__none__">None</SelectItem>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.key}>
                      {key.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Danger icon + No API keys detected */}
            {apiKeys.length === 0 && (
              <div className="flex items-center gap-2 text-xs">
                <InfoIcon className="text-smyth-red w-4 h-4" />
                <span>
                  No API keys detected.{' '}
                  <span
                    className="underline cursor-pointer text-blue-600"
                    onClick={() => setActiveTab('create-key')}
                  >
                    Create an API key here.
                  </span>
                </span>
              </div>
            )}
          </div>
          {/* Instructional text */}
          <div className="text-xs text-[#888]">
            <div className="mt-[-12px]">
              In your application code, initialize your agent with the OpenAI chat completions code
              snippet below:
            </div>
          </div>
          {/* Code/Version/Language Dropdowns */}
          <div className="flex gap-2 mb-2">
            <div className="flex flex-col flex-1">
              <label
                htmlFor="code-language-select"
                className="text-md font-medium text-gray-700 mb-1"
              >
                Code
              </label>
              <Select
                value={selectedLanguage}
                onValueChange={(v) => setSelectedLanguage(v as CodeLanguage)}
              >
                <SelectTrigger
                  id="code-language-select"
                  className={selectTriggerClass}
                  aria-label="Code Language"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onClick={(e) => e.stopPropagation()}>
                  <SelectItem value="nodejs">Node.js</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="curl">cURL</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col flex-1">
              <label htmlFor="version-select" className="text-md font-medium text-gray-700 mb-1">
                Version
              </label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger
                  id="version-select"
                  className={selectTriggerClass}
                  aria-label="Version"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onClick={(e) => e.stopPropagation()}>
                  <SelectItem value="dev">Development</SelectItem>
                  <SelectItem value="prod">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Code block: white background, gray border, grows up to 400px, scrolls if needed */}
          <Textarea
            ref={codeRef}
            value={codeSample.code}
            readOnly
            className="w-full min-h-[250px] max-h-[400px] p-2 font-mono text-xs resize-none overflow-auto"
            fullWidth
            aria-label="Code Sample"
          />
          {/* Bonus text */}
          <div className="text-xs text-[#888] mt-1">
            Bonus: Customize the model version and language.
          </div>
          {/* Copy Code button */}
          <div className="flex justify-end">
            <Button
              label={copyState === 'copied' ? 'Copied' : 'Copy Code'}
              variant="primary"
              className="px-4 py-2"
              handleClick={handleCopyCode}
              aria-label="Copy Code"
              type="button"
            />
          </div>
        </TabsContent>
        {/* Keys Tab */}
        {activeTab === 'keys' && (
          <TabsContent value="keys" className="space-y-4">
            <div className="space-y-2">
              {isLoadingKeys ? (
                <div className="text-center text-gray-400">Loading keys...</div>
              ) : apiKeys.length === 0 ? (
                <div className="flex flex-col items-start w-full">
                  <div className="w-full bg-gray-50 rounded-lg px-3 py-8 text-center text-gray-400 font-extralight">
                    No API keys found.
                  </div>
                  <div className="flex justify-end w-full mt-4">
                    <Button
                      label="Create a new key"
                      variant="primary"
                      className="px-6 py-2"
                      handleClick={handleOpenCreateKey}
                      aria-label="Create a new key"
                      type="button"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-base font-normal text-gray-900">Keys</div>
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex flex-col bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                          {key.name}
                        </span>
                        <div className="flex items-center">
                          <button
                            className="p-1 rounded group hover:bg-gray-200"
                            onClick={async () => {
                              await navigator.clipboard.writeText(key.key);
                            }}
                            aria-label="Copy API Key"
                            title="Copy"
                            type="button"
                          >
                            <CopyKeyIcon
                              className="w-6 h-6"
                              color={COPY_ICON_COLOR}
                              style={{ transition: 'color 0.2s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = COPY_ICON_HOVER)}
                              onMouseLeave={(e) => (e.currentTarget.style.color = COPY_ICON_COLOR)}
                            />
                          </button>
                          <button
                            className="p-1 rounded group hover:bg-gray-200"
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={isRevokingKey === key.id}
                            aria-label="Delete Key"
                            title="Delete"
                            type="button"
                          >
                            {isRevokingKey === key.id ? (
                              <Spinner size="sm" classes="w-6 h-6" />
                            ) : (
                              <DeleteKeyIcon
                                className="w-6 h-6"
                                color={DELETE_ICON_COLOR}
                                style={{ transition: 'color 0.2s' }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.color = DELETE_ICON_HOVER)
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.color = DELETE_ICON_COLOR)
                                }
                              />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="font-mono text-xs text-gray-900 break-all w-full">
                        {key.key}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{key.createdAt}</div>
                    </div>
                  ))}
                  {/* Right-aligned Create a new key button (primary) */}
                  <div className="flex justify-end mt-4">
                    <Button
                      label="Create a new key"
                      variant="primary"
                      className="px-6 py-2 text-sm"
                      handleClick={handleOpenCreateKey}
                      aria-label="Create a new key"
                      type="button"
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        )}
        {/* Create Key Modal */}
        {activeTab === 'create-key' && (
          <TabsContent value="create-key" className="space-y-2">
            {/* Section Title */}
            <div className="mb-3 -mt-4">
              <span className="text-md font-normal">Keys</span>
            </div>
            {/* Key Name Input */}
            <div className="mb-4">
              <Input
                label="Key Name"
                placeholder="API key"
                value={createKeyName}
                onChange={(e) => setCreateKeyName(e.target.value)}
                aria-label="Key Name"
                disabled={isCreatingKey}
                fullWidth
              />
            </div>
            {/* Right-aligned Add Key button */}
            <div className="flex justify-end">
              <Button
                label={isCreatingKey ? 'Adding...' : 'Add Key'}
                variant="primary"
                className="px-6 py-2 text-base"
                handleClick={handleCreateKey}
                aria-label="Add Key"
                type="button"
                disabled={isCreatingKey || !createKeyName.trim()}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LlmEmbodimentModal;
