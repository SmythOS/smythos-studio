import { saveEmbodiment } from '@react/features/agent-settings/clients';
import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { EMBODIMENT_TYPE } from '@react/shared/enums';
import { useAgentEmbodiments } from '@src/react/features/embodiments/embodiment-helper';
import { SkeletonLoader } from '@src/react/shared/components/ui/skeleton-loader';
import { Embodiment } from '@src/react/shared/types/api-results.types';
import { errorToast, successToast } from '@src/shared/components/toast';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

/**
 * Props for the AllowedDomainsWidget component
 */
type Props = {
  isWriteAccess?: boolean;
};

/**
 * Embodiment types that support allowed domains configuration
 */
const DOMAIN_SUPPORTED_EMBODIMENTS = [
  EMBODIMENT_TYPE.CHAT_BOT,
  EMBODIMENT_TYPE.FORM,
  EMBODIMENT_TYPE.ALEXA,
] as const;

/**
 * AllowedDomainsWidget component
 * Displays and manages allowed domains for all embodiments that support domain restrictions.
 * Allows adding/removing domains that are applied to Chatbot, Form Preview, and Voice embodiments.
 */
const AllowedDomainsWidget = ({ isWriteAccess }: Props) => {
  const { agentId } = useAgentSettingsCtx();
  const queryClient = useQueryClient();

  // Local state for managing domains
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
 * Extracts unique allowed domains from all supported embodiments
 * @param embodiments - Array of embodiments to extract domains from
 * @returns Array of unique domain strings
 */
  const extractDomainsFromEmbodiments = (embodiments: Embodiment[]): void => {
    const domainSet = new Set<string>();

    embodiments.forEach((embodiment) => {
      if (
        DOMAIN_SUPPORTED_EMBODIMENTS.includes(embodiment.type as typeof DOMAIN_SUPPORTED_EMBODIMENTS[number]) &&
        Array.isArray(embodiment.properties?.allowedDomains)
      ) {
        embodiment.properties.allowedDomains.forEach((domain) => {
          if (domain && domain.trim()) {
            domainSet.add(domain.trim());
          }
        });
      }
    });

    const allDomains = Array.from(domainSet).sort();
    setDomains(allDomains);
  };


  // Use React Query helper for agent embodiments first
  const {
    data: embodimentsData = [],
    isLoading: embodimentsLoading,
  } = useAgentEmbodiments(agentId, extractDomainsFromEmbodiments);

  /**
   * Validates a single domain string
   * Uses a simple domain pattern validation
   * @param domain - Domain string to validate
   * @returns true if domain is valid
   */
  const isValidDomain = (domain: string): boolean => {
    const trimmedDomain = domain.trim();
    if (!trimmedDomain) return false;

    // Simple domain pattern: allows subdomains, main domain, and TLD
    // Examples: example.com, app.example.com, my-site.org
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainPattern.test(trimmedDomain);
  };

  /**
   * Handles adding a new domain
   */
  const handleAddDomain = useCallback(() => {
    const trimmedDomain = newDomain.trim().toLowerCase();

    if (!trimmedDomain) {
      setDomainError('Please enter a domain');
      return;
    }

    if (!isValidDomain(trimmedDomain)) {
      setDomainError('Invalid domain format. Please enter a valid domain (e.g., example.com)');
      return;
    }

    if (domains.includes(trimmedDomain)) {
      setDomainError('This domain has already been added');
      return;
    }

    setDomains((prev) => [...prev, trimmedDomain].sort());
    setNewDomain('');
    setDomainError(null);
    setHasUnsavedChanges(true);
  }, [newDomain, domains]);

  /**
   * Handles removing a domain
   * @param domainToRemove - Domain string to remove
   */
  const handleRemoveDomain = useCallback((domainToRemove: string) => {
    setDomains((prev) => prev.filter((d) => d !== domainToRemove));
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Handles keyboard events for the input field
   * @param e - Keyboard event
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDomain();
    }
  };

  /**
   * Saves domains to all supported embodiments
   */
  const handleSaveDomains = useCallback(async () => {
    if (!embodimentsData) return;

    setIsSaving(true);

    try {
      // Check if the agent has a Chatbot embodiment object
      const chatBotEmbodiment = embodimentsData.find((emb) =>
        emb.type === EMBODIMENT_TYPE.CHAT_BOT,
      );

      const dataToSend = {
        type: EMBODIMENT_TYPE.CHAT_BOT,
        properties: {
          allowedDomains: domains,
        },
      };

      if (chatBotEmbodiment) {
        dataToSend['embodimentId'] = chatBotEmbodiment.id;
        dataToSend['properties'] = {
          ...chatBotEmbodiment.properties,
          allowedDomains: domains,
        };
      } else {
        dataToSend['aiAgentId'] = agentId;
      }

      await saveEmbodiment(chatBotEmbodiment ? 'PUT' : 'POST', dataToSend);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['agentEmbodiments', agentId] });
      queryClient.invalidateQueries({ queryKey: ['embodiments', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent_embodiments', agentId] });
      queryClient.invalidateQueries({ queryKey: ['availableEmbodiments', agentId] });

      setHasUnsavedChanges(false);
      successToast('Allowed domains saved successfully');
    } catch (error) {
      console.error('Failed to save allowed domains:', error);
      errorToast('Failed to save allowed domains. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [embodimentsData, domains, agentId, queryClient]);

  // Show loading state
  if (embodimentsLoading) {
    return <SkeletonLoader title="Allowed Domains" />;
  }

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess}>
      <div
        className="flex flex-col rounded-lg border border-gray-600 p-4 bg-gray-50"
        data-qa="allowed-domains-container"
      >
        {/* Header section */}
        <div className="flex justify-between items-start">
          <div className="w-full">
            <div className="flex items-center">
              <h3 className="text-sm font-semibold text-gray-700">Allowed Domains</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Specify which domains can host your embodiments. This setting applies to Chatbot, Form Preview, and Voice.
            </p>
          </div>
        </div>


        <>
          {/* Add domain input */}
          <div className="mt-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Enter domain (e.g., example.com)"
                  value={newDomain}
                  onChange={(e) => {
                    setNewDomain(e.target.value);
                    if (domainError) setDomainError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  className={`w-full p-2 text-sm border rounded-md bg-white ${domainError
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-v2-blue focus:border-v2-blue'
                    }`}
                  disabled={!isWriteAccess || isSaving}
                />
              </div>
              <button
                type="button"
                onClick={handleAddDomain}
                disabled={!isWriteAccess || isSaving || !newDomain.trim()}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-v2-blue rounded-md hover:bg-v2-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {domainError && <p className="mt-1 text-xs text-red-500">{domainError}</p>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 w-full my-2">
            <p className="text-amber-800 text-xs">
              <strong>Note:</strong> If no domain is allowed, the embodiment will be restricted from all domains.
            </p>
          </div>

          {/* Domains list */}
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => (
                <div
                  key={domain}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-200 rounded-full text-sm text-green-800 hover:bg-green-100 transition-colors"
                >
                  <span>{domain}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(domain)}
                    disabled={!isWriteAccess || isSaving}
                    className="ml-0.5 p-0.5 text-green-600 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove domain"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end mt-4">
            <CustomButton
              label="Save Domains"
              handleClick={handleSaveDomains}
              loading={isSaving}
              disabled={!isWriteAccess || isSaving || !hasUnsavedChanges}
            />
          </div>
        </>

      </div>
    </WidgetCard>
  );
};

export default AllowedDomainsWidget;
