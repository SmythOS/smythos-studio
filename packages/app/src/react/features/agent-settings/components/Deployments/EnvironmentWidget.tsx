import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { CopyKeyIcon } from '@react/shared/components/svgs';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { builderStore } from '@src/shared/state_stores/builder/store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { FaUpRightFromSquare } from 'react-icons/fa6';

type Props = {
  isWriteAccess?: boolean;
  isDeployed?: boolean;
};

/**
 * Type for server status response
 */
type ServerStatus = {
  baseUrl: string;
  frontUrl: string;
  debugUrl: string;
  docUrl: string;
  dbgUrl: string;
  agent_domain: string;
  env: string;
  status: string;
  prod_agent_domain: string;
  user: unknown;
  userData: unknown;
};
// DomainRow Component
type DomainRowProps = {
  label: string;
  value: string;
  options?: string[];
  showAPI?: boolean;
  onAPIClick?: (domain: string) => void;
  onCopyClick?: (domain: string) => void;
  onExternalClick?: (domain: string) => void;
  onValueChange?: (value: string) => void;
};

const DomainRow = ({
  label,
  value,
  options,
  showAPI = false,
  onCopyClick,
  onAPIClick,
  onExternalClick,
  onValueChange,
}: DomainRowProps) => {
  const [selectedDomain, setSelectedDomain] = useState<string>(value || '[None]');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    setSelectedDomain(value || '[None]');
  }, [value]);

  // Determine if buttons should be shown
  const shouldShowButtons = selectedDomain !== '[None]';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">{label}</span>
        </div>
        {/* Only show buttons if domain is not '[None]' */}
        {shouldShowButtons && (
          <div className="flex items-center">
            {showAPI && (
              <>
                <button
                  onClick={() => {
                    onCopyClick?.(selectedDomain);
                    setIsCopied(true);
                    setTimeout(() => {
                      setIsCopied(false);
                    }, 1000);
                  }}
                  className="relative flex items-center gap-2 mr-1 w-5 h-5"
                >
                  {!isCopied ? (
                    <CopyKeyIcon color="#1d4ed8" width={20} height={20} />
                  ) : (
                    <FaCheck className="w-3 h-3 text-sm text-success-green ml-2" />
                  )}
                </button>
                <button
                  onClick={() => onAPIClick?.(selectedDomain)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mr-2"
                >
                  {/* <VscGear className="w-4 h-4" /> */}
                  <span className="text-sm">API</span>
                </button>
              </>
            )}
            <button
              onClick={() => onExternalClick?.(selectedDomain)}
              className="text-blue-600 hover:text-blue-700"
            >
              <FaUpRightFromSquare className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="w-full">
        {options ? (
          <select
            value={selectedDomain}
            onChange={(e) => {
              setSelectedDomain(e.target.value);
              onValueChange?.(e.target.value);
            }}
            className="w-full p-2 pr-7 text-ellipsis overflow-hidden bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-v2-blue focus:border-v2-blue"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            readOnly
            value={selectedDomain}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="border-none w-full p-2.5 truncate bg-white border border-gray-300 rounded-lg text-sm text-gray-900 cursor-text outline-none focus:outline-none focus:ring-0 focus:border-gray-300"
          />
        )}
      </div>
    </div>
  );
};

// Add type definition for domain data
type Domain = {
  name: string;
  aiAgent: {
    id: string;
  } | null;
};

// Add a utility function at the top of the file
const ensureHttps = (url: string): string => {
  if (!url || url === '#') return '#';
  return url.startsWith('http') ? url : `https://${url}`;
};

// Main EnvironmentWidget Component
const EnvironmentWidget = ({ isWriteAccess, isDeployed }: Props) => {
  const { agentQuery, workspace, agentId, serverStatusData } = useAgentSettingsCtx();
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const isFirstRender = useRef(true);

  // Query for server status (existing)
  const serverData = serverStatusData;

  // Query for domains list
  const { data: domainData } = useQuery<Domain[]>({
    queryKey: ['domains'],
    queryFn: async () => {
      const response = await fetch('/api/page/builder/domains', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to load domains');
      }

      return response.json();
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
  // Move availableDomains declaration up
  const availableDomains = useMemo(() => {
    const filteredDomains = domainData
      ?.filter((d) => d.aiAgent == null || d.aiAgent.id === agentId)
      ?.map((item) => item.name);
    let prodDomain = `${agentId}.${
      workspace?.serverData?.prod_agent_domain || serverData?.prod_agent_domain || ''
    }`;

    if (workspace?.serverData?.prod_agent_domain || serverData?.prod_agent_domain) {
      return ['[None]', prodDomain, ...new Set(filteredDomains)];
    }
    return ['[None]', ...new Set(filteredDomains)];
  }, [domainData, workspace, agentId, serverData]);

  // Mutation for updating domain
  const updateDomainMutation = useMutation({
    mutationFn: async ({
      agentId,
      curDomain,
      domain,
    }: {
      agentId: string;
      curDomain: string;
      domain: string;
    }) => {
      const response = await fetch('/api/page/builder/updateDomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, curDomain, domain }),
      });

      if (!response.ok) {
        throw new Error('Failed to update domain');
      }

      return response.json();
    },
  });

  // Calculate test domain URL
  const testDomainUrl = useMemo(() => {
    if (!agentId) return '';

    const agentDomain = workspace?.serverData?.agent_domain || serverData?.agent_domain;
    if (!agentDomain) return '';

    // Use consistent protocol determination
    const protocol = workspace?.serverData?.frontUrl
      ? new URL(workspace.serverData.frontUrl).protocol
      : serverData?.frontUrl
      ? new URL(serverData.frontUrl).protocol
      : 'https:';

    return `${protocol}//${agentId}.${agentDomain}`;
  }, [workspace?.serverData, agentId, serverData]);

  // Handle domain change
  const handleDomainChange = async (newDomain: string) => {
    setSelectedDomain(newDomain);
    setHasChanges(true); // Mark that changes have been made
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const curDomain = workspace?.agent?.domain || selectedDomain || '';
      await updateDomainMutation.mutateAsync({
        agentId: agentId,
        curDomain,
        domain: selectedDomain,
      });

      // Update workspace agent domain if needed
      if (workspace?.agent) {
        workspace.agent.domain = selectedDomain;
      }

      // update global state
      builderStore.setState((prev) => ({
        agentDomains: {
          ...prev.agentDomains,
          prod: selectedDomain,
          scheme: 'https',
        },
      }));

      setHasChanges(false); // Reset changes flag after successful save
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (agentQuery?.data?.domain?.length) {
      // If agent has a domain set in the data, use that
      setSelectedDomain(agentQuery.data.domain[0]?.name);
    } else if (domainData !== undefined && domainData !== null) {
      // Check for domains associated with this agent
      const agentDomains = domainData
        ?.filter((d) => d?.aiAgent?.id === agentId)
        ?.map((item) => item.name);

      if (agentDomains?.length) {
        setSelectedDomain(agentDomains[0]);
      } else if (isDeployed && availableDomains?.length) {
        // For deployed agents without a domain, suggest a domain
        if (availableDomains[0] !== '[None]') {
          setSelectedDomain(availableDomains[0]);
        } else if (availableDomains?.length > 1) {
          setSelectedDomain(availableDomains[1]);
        } else {
          setSelectedDomain('[None]');
        }
      } else {
        setSelectedDomain('[None]');
      }
    }
  }, [domainData, availableDomains, isDeployed, agentQuery?.data?.domain, agentId]);

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess}>
      <div className="flex flex-col space-y-6 p-4 bg-gray-50" data-qa="environment-container">
        {/* Header */}
        <div>
          <div className="flex items-start gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Environment</h3>
          </div>
          <p className="text-sm text-gray-600">
            Access Live production domain and test domain of agents.
          </p>
        </div>

        {/* Production Domain */}
        <DomainRow
          label="Production Domain"
          value={selectedDomain || '[None]'}
          options={availableDomains}
          showAPI={selectedDomain !== '[None]'}
          onCopyClick={(domain) => {
            navigator.clipboard.writeText(`${ensureHttps(domain)}/swagger`);
          }}
          onAPIClick={(domain) => {
            if (domain === 'None') {
              window.open('#', '_blank');
            } else {
              window.open(`${ensureHttps(domain)}/swagger`, '_blank');
            }
          }}
          onExternalClick={(domain) => {
            if (domain === 'None') {
              window.open('#', '_blank');
            } else {
              window.open(ensureHttps(domain), '_blank');
            }
          }}
          onValueChange={handleDomainChange}
        />

        {/* Test Domain */}
        <DomainRow
          label={`Test Domain`}
          value={testDomainUrl}
          onCopyClick={(domain) => {
            navigator.clipboard.writeText(`${ensureHttps(domain)}/swagger`);
          }}
          onExternalClick={(domain) => {
            window.open(ensureHttps(domain), '_blank');
          }}
          onAPIClick={(domain) => {
            window.open(`${ensureHttps(domain)}/swagger`, '_blank');
          }}
          showAPI={true}
        />

        {/* Save Button */}
        {hasChanges && isWriteAccess && (
          <div className="flex justify-end border-t border-gray-200">
            <Button
              disabled={isSaving}
              loading={isSaving}
              handleClick={handleSaveSettings}
              className="px-2 py-1"
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </WidgetCard>
  );
};

export default EnvironmentWidget;
