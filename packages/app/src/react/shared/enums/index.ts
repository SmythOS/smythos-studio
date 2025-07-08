enum DEFAULT_COLORS {
  SMYTH_PRIMARY_COLOR = '#45c98d',
  BLACK = '#000000',
  WHITE = '#ffffff',
  GREY = '#f1f1f0',
}

export enum FRONTEND_USER_SETTINGS {
  SIDEBAR_COLLAPSED = 'sidebarCollapsed',
  CURRENT_SPACE_ID = 'currentSpaceId',
  REDIRECT_PATH_KEY_WELCOME_PAGE = 'redirectPathWelcomePage',
  HIDE_BACK_BUTTON_WELCOME_PAGE = 'hideBackButtonWelcomePage',
  ACCEPT_INVITE_LOGGED = 'acceptInviteLogged',
  WHAT_ARE_YOU_BUILDING = 'whatAreYouBuilding',
}

export enum EMBODIMENT_TYPE {
  CHAT_GPT = 'chatgpt',
  CHAT_BOT = 'chatbot',
  API = 'api',
  MCP = 'mcp',
  DISCORD = 'discord',
  FORM = 'form',
  LLM = 'llm', // Add this line
  ALEXA = 'alexa',
}

export enum DEFAULT_CHAT_COLORS {
  botTextColor = DEFAULT_COLORS.BLACK,
  humanTextColor = DEFAULT_COLORS.WHITE,
  botBubbleBackgroundColorStart = DEFAULT_COLORS.GREY,
  botBubbleBackgroundColorEnd = DEFAULT_COLORS.GREY,
  humanBubbleBackgroundColorStart = DEFAULT_COLORS.SMYTH_PRIMARY_COLOR,
  humanBubbleBackgroundColorEnd = DEFAULT_COLORS.SMYTH_PRIMARY_COLOR,
  chatWindowBackgroundColor = DEFAULT_COLORS.WHITE,
  chatHeaderBackgroundColor = DEFAULT_COLORS.WHITE,
  chatFooterBackgroundColor = DEFAULT_COLORS.WHITE,
  chatTogglerColor = DEFAULT_COLORS.SMYTH_PRIMARY_COLOR,
  chatTogglerTextColor = DEFAULT_COLORS.WHITE,
  sendButtonBackgroundColor = DEFAULT_COLORS.SMYTH_PRIMARY_COLOR,
  sendButtonTextColor = DEFAULT_COLORS.WHITE,
}

export enum PRICING_PLANS {
  FREE = 'Free',
  STARTER = 'Starter',
  PROFESSIONAL = 'Professional',
  COMPANY = 'Business',
  PREMIUM = 'Premium',
  ENTERPRISE = 'Enterprise',
  EARLY_ADOPTERS = 'Early Adopters',
  FREE_FOREVER = 'Free Forever',
}

export enum PRICING_PLANS_V4 {
  STARTUP = 'Startup',
  BUILDER = 'Builder',
  SCALEUP = 'Scaleup',
  FREE = 'SmythOS Free',
  ENTERPRISE = 'Enterprise',
  FREE_FOREVER = 'Free Forever',
  EARLY_ADOPTERS = 'Early Adopters',
}

export enum ERROR_TYPES {
  ALREADY_SUBSCRIBED = 'Already Subscribed',
  GENERIC = 'Generic',
}
