export type TChatBotProperties = {
  name: string;
  introMessage: string;
  chatGptModel: string;
  syntaxHighlightTheme: string;
  personality: string;
  icon: string;
  colors: {
    botBubbleColors: {
      textColor: string;
      backgroundColorStart: string;
      backgroundColorEnd: string;
    };
    humanBubbleColors: {
      textColor: string;
      backgroundColorStart: string;
      backgroundColorEnd: string;
    };
    chatWindowColors: {
      backgroundColor: string;
      headerBackgroundColor: string;
      footerBackgroundColor: string;
    };
    chatTogglerColors: {
      backgroundColor: string;
      textColor: string;
    };
    sendButtonColors: {
      backgroundColor: string;
      textColor: string;
    };
  };
  allowedDomains: string[];
  isFullScreen?: boolean;
  allowFileAttachments?: boolean;
};

export type TFormPreviewProperties = {
  name: string;
  allowedDomains: string[];
  outputPreview: boolean;
};

export type TVoiceProperties = {
  name: string;
  allowedDomains: string[];
};

export type TGptEmbodimentProperties = {
  humanName: string;
  modelName: string;
  humanDescription: string;
  modelDescription: string;
  logoUrl: string;
  contactEmail: string;
  legalInfoUrl: string;
};
