import { useCallback, useState } from 'react';

interface ChatbotStateProps {
  isBoxOpen?: boolean;
  isChatOnly?: boolean;
  domain?: string;
  props?: any;
}

interface ChatbotSettings {
  domain?: string;
  chatbotEnabled: boolean;
  name: string;
  introMessage: string;
  port: number;
  headers: Record<string, string>;
  authRequired: boolean;
  colors: {
    chatTogglerColors: {
      backgroundColor: string;
      textColor: string;
    };
    chatWindowColors: {
      backgroundColor: string;
    };
    botBubbleColors: {
      backgroundColorStart: string;
      backgroundColorEnd: string;
      textColor: string;
    };
  };
  botBubbleClass: string;
  humanBubbleClass: string;
  syntaxHighlightTheme: string;
}

/**
 * Custom hook for chatbot state management (inspired by ChatBox functionality)
 * Manages chatbot configuration, settings, authentication, and UI state
 */
export const useChatbotState = ({ isBoxOpen, isChatOnly, domain, props }: ChatbotStateProps) => {
  const [isTyped, setIsTyped] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [devPort, setDevPort] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(isBoxOpen || isChatOnly);
  const [isOpenStyle, setIsOpenStyle] = useState(false);
  const [defaultSettings, setDefaultSettings] = useState<ChatbotSettings>({
    chatbotEnabled: true,
    name: 'AI Assistant',
    introMessage: 'Hi, I am your AI assistant. How can I help you?',
    port: 3000,
    headers: {},
    authRequired: false,
    colors: {
      chatTogglerColors: {
        backgroundColor: '#45c98d',
        textColor: '#ffffff',
      },
      chatWindowColors: {
        backgroundColor: '#ffffff',
      },
      botBubbleColors: {
        backgroundColorStart: '#f3f4f6',
        backgroundColorEnd: '#e5e7eb',
        textColor: '#374151',
      },
    },
    botBubbleClass: '',
    humanBubbleClass: '',
    syntaxHighlightTheme: 'prism',
    ...props,
  });
  const [isDefaultSettingsLoading, setIsDefaultSettingsLoading] = useState(false);
  const [isAuthVerificationLoading, setIsAuthVerificationLoading] = useState(false);
  const [apiHeaders, setApiHeaders] = useState<Record<string, string>>();

  /**
   * Loads chatbot settings from API or configuration
   * In real implementation, this would fetch from API
   */
  const loadSettings = useCallback(async (): Promise<ChatbotSettings> => {
    try {
      setIsDefaultSettingsLoading(true);
      // Mock settings loading - in real implementation, this would fetch from API
      const settings: ChatbotSettings = {
        domain,
        chatbotEnabled: true,
        name: 'AI Assistant',
        introMessage: 'Hi, I am your AI assistant. How can I help you?',
        port: 3000,
        headers: {},
        authRequired: false,
        colors: {
          chatTogglerColors: {
            backgroundColor: '#45c98d',
            textColor: '#ffffff',
          },
          chatWindowColors: {
            backgroundColor: '#ffffff',
          },
          botBubbleColors: {
            backgroundColorStart: '#f3f4f6',
            backgroundColorEnd: '#e5e7eb',
            textColor: '#374151',
          },
        },
        botBubbleClass: '',
        humanBubbleClass: '',
        syntaxHighlightTheme: 'prism',
        ...props,
      };

      setDefaultSettings(settings);
      setDevPort(settings.port);
      setApiHeaders(settings.headers);

      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      throw error;
    } finally {
      setIsDefaultSettingsLoading(false);
    }
  }, [domain, props]);

  /**
   * Verifies authentication if required
   */
  const verifyAuth = useCallback(async (): Promise<void> => {
    if (!defaultSettings?.authRequired) return;

    try {
      setIsAuthVerificationLoading(true);
      await loadSettings();
    } catch (error) {
      console.error('Auth verification failed:', error);
    } finally {
      setIsAuthVerificationLoading(false);
    }
  }, [defaultSettings?.authRequired, loadSettings]);

  return {
    devPort,
    isOpen,
    setIsOpen,
    setIsTyped,
    apiHeaders,
    verifyAuth,
    isOpenStyle,
    loadSettings,
    setIsOpenStyle,
    defaultSettings,
    setCurrentMessage,
    setDefaultSettings,
    isDefaultSettingsLoading,
    isAuthVerificationLoading,
  };
};
