import { createPortal } from 'react-dom';
import { FaCommentDots, FaDiscord, FaGear, FaIdCard, FaRobot } from 'react-icons/fa6';
import { AlexaIcon, ChatGptIcon, LovableIcon, MCPIcon } from '../../shared/components/svgs';
import { EMBODIMENT_TYPE } from '../../shared/enums';
import ChatBotDialog from '../agent-settings/dialogs/ChatBot';
import ChatGptDialog from '../agent-settings/dialogs/ChatGpt';
import FormPreviewDialog from '../agent-settings/dialogs/FormPreview';
import ChatbotCodeSnippetModal from '../agent-settings/modals/chatbotCode.modal';

export const AlwaysAvailableEmbodiments = [
  'API',
  EMBODIMENT_TYPE.MCP,
  EMBODIMENT_TYPE.ALEXA,
  // TODO: Uncomment this when Ingrid provides the updated prompt for integration
  // EMBODIMENT_TYPE.LOVABLE,
];

export const getEmbodimentIcon = (embodimentType: string, classes = ''): JSX.Element => {
  switch (embodimentType.toLowerCase()) {
    case EMBODIMENT_TYPE.CHAT_BOT:
      return <FaCommentDots className={classes} />;
    case EMBODIMENT_TYPE.CHAT_GPT:
      return <ChatGptIcon className={classes} />;
    case EMBODIMENT_TYPE.API:
      return <FaGear className={classes} />;
    case EMBODIMENT_TYPE.MCP:
      return <MCPIcon className={classes} />;
    case EMBODIMENT_TYPE.DISCORD:
      return <FaDiscord className={classes} />;
    case EMBODIMENT_TYPE.FORM:
      return <FaIdCard className={classes} />;
    case EMBODIMENT_TYPE.LLM:
      return <FaRobot className={classes} style={{ marginTop: '-3px' }} />;
    case EMBODIMENT_TYPE.ALEXA:
      return <AlexaIcon className={classes} />;
    case EMBODIMENT_TYPE.LOVABLE:
      return <LovableIcon className={classes} />;
    default:
      return <></>;
  }
};

export const getEmbodimentTitle = (embodimentType: string): string => {
  switch (embodimentType.toLowerCase()) {
    case EMBODIMENT_TYPE.LLM:
      return 'LLM';
    case EMBODIMENT_TYPE.MCP:
      return 'MCP';
    case EMBODIMENT_TYPE.FORM:
      return 'Form Preview';
    default:
      return embodimentType;
  }
};

export const getEmbodimentDescription = (embodimentType: string): string => {
  switch (embodimentType.toLowerCase()) {
    case EMBODIMENT_TYPE.CHAT_GPT:
      return 'Your AI agent is active and accessible directly within ChatGPT for seamless interactions.';
    case EMBODIMENT_TYPE.CHAT_BOT:
      return 'Your AI agent powers chatbot integrations, enhancing automated conversations on your platforms.';
    case EMBODIMENT_TYPE.API:
      return 'Enable Agent to communicate with each other using a set of definitions and protocols.';
    case EMBODIMENT_TYPE.MCP:
      return 'Enable MCP Client to communicate with your agent.';
    case EMBODIMENT_TYPE.ALEXA:
      return 'Enable Alexa to communicate with your agent.';
    case EMBODIMENT_TYPE.LLM:
      return 'Use your agent as an OpenAI-compatible API endpoint for seamless integration with existing LLM workflows.';
    case EMBODIMENT_TYPE.FORM:
      return 'Preview your agent as a form for seamless integration with existing workflows.';
    case EMBODIMENT_TYPE.LOVABLE:
      return 'Get step-by-step instructions to connect this agent or workflow to Lovable.';
    default:
      return '';
  }
};

export const getEmbodimentDataAttribute = (embodimentType: string): string => {
  switch (embodimentType.toLowerCase()) {
    case EMBODIMENT_TYPE.CHAT_BOT:
      return 'chatbot-embodiment-card';
    case EMBODIMENT_TYPE.CHAT_GPT:
      return 'chatgpt-embodiment-card';
    case EMBODIMENT_TYPE.API:
      return 'api-embodiment-card';
    case EMBODIMENT_TYPE.MCP:
      return 'mcp-embodiment-card';
    case EMBODIMENT_TYPE.ALEXA:
      return 'alexa-embodiment-card';
    case EMBODIMENT_TYPE.LLM:
      return 'agentllm-embodiment-card';
    case EMBODIMENT_TYPE.FORM:
      return 'form-embodiment-card';
    case EMBODIMENT_TYPE.LOVABLE:
      return 'lovable-embodiment-card';
    default:
      return '';
  }
};

export const getChatGptDialog = (
  isOpen: boolean,
  closeModal: () => void,
  agent,
  agentId,
  currentData,
  refreshEmbodiments,
  activeModal,
) => {
  // Always render the component for preloading, HeadlessUI Transition handles visibility
  // This ensures the component is initialized and ready when the user opens it
  return (
    <ChatGptDialog
      isOpen={isOpen}
      closeModal={closeModal}
      activeAgent={agent}
      agentId={agentId}
      currentData={currentData}
      refreshEmbodiments={() => refreshEmbodiments()}
      style={{}}
    />
  );
};

export const getChatBotDialog = (
  isOpen: boolean,
  closeModal: () => void,
  agent,
  agentId,
  currentData,
  refreshEmbodiments,
  activeModal,
) => {
  // Always render the component for preloading, HeadlessUI Transition handles visibility
  // This ensures the component is initialized and ready when the user opens it
  return (
    <ChatBotDialog
      isOpen={isOpen}
      closeModal={closeModal}
      activeAgent={agent}
      agentId={agentId}
      currentData={currentData}
      refreshEmbodiments={() => refreshEmbodiments()}
      style={{}}
    />
  );
};

export const getFormPreviewDialog = (
  isOpen: boolean,
  closeModal: () => void,
  agent,
  agentId,
  currentData,
  refreshEmbodiments,
  activeModal,
) => {
  // Always render the component for preloading, HeadlessUI Transition handles visibility
  // This ensures the component is initialized and ready when the user opens it
  return (
    <FormPreviewDialog
      isOpen={isOpen}
      closeModal={closeModal}
      activeAgent={agent}
      agentId={agentId}
      currentData={currentData}
      refreshEmbodiments={() => refreshEmbodiments()}
      style={{}}
    />
  );
};

export const getCodeSnippetModal = (
  isOpen: boolean,
  closeModal: () => void,
  agent,
  agentId,
  embodimentsData,
) => {
  // For iframe-based components, conditionally render to allow iframe reload
  // This satisfies the user requirement that iframe components can reload each time
  if (!isOpen) {
    return null; // Return null to not render when closed, allowing iframe to reload
  }

  return createPortal(
    <ChatbotCodeSnippetModal
      onClose={closeModal}
      domain={agent?.domain?.[0]?.name}
      embodimentData={embodimentsData?.find(
        (e) => e?.aiAgentId === agentId && e?.type === EMBODIMENT_TYPE.CHAT_BOT,
      )}
    />,
    document.body,
  );
};
