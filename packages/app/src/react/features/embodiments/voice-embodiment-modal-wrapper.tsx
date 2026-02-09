import { useEffect, useState } from 'react';
import { useAgentSettingsCtx } from '../agent-settings/contexts/agent-settings.context';
import VoiceEmbodimentModal from './voice-embodiment-modal';

const VoiceEmbodimentModalWrapper = ({
  onClose,
  domain,
}: {
  onClose: () => void;
  domain: string;
}) => {
  const { workspace, agentId, serverStatusData } = useAgentSettingsCtx();

  const [agentDomains, setAgentDomains] = useState({
    dev: null,
    prod: null,
    scheme: 'https',
  });

  useEffect(() => {
    // Fallback to workspace and server data
    if (agentId && (serverStatusData || workspace)) {
      const devDomain = `${agentId}.${serverStatusData.agent_domain}`;
      const prodDomain =
        workspace?.agent?.domain || `${agentId}.${serverStatusData.prod_agent_domain}`;
      const scheme = serverStatusData.agent_domain?.includes(':') ? 'http' : 'https';

      setAgentDomains({
        dev: devDomain,
        prod: prodDomain,
        scheme: scheme,
      });
    }
  }, [workspace, agentId, serverStatusData]);

  return <VoiceEmbodimentModal onClose={onClose} agentDomains={agentDomains} />;
};

export default VoiceEmbodimentModalWrapper;
