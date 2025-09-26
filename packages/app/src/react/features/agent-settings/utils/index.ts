import { SYNTAX_HIGHLIGHT_THEMES } from '@react/features/agent-settings/constants';
import { DEFAULT_CHAT_COLORS } from '@react/shared/enums';
import { Input } from '@react/shared/types/agent-data.types';
import {
  TChatBotProperties,
  TFormPreviewProperties,
  TGptEmbodimentProperties,
  TVoiceProperties,
} from '@react/shared/types/embodiment.types';
import * as Yup from 'yup';

export const generateComponentInputsSchema = (inputs: Input[]) => {
  return Yup.object().shape(
    inputs.reduce((acc, input) => {
      let schema: Yup.Schema;

      switch (input.type) {
        case 'String':
        case 'Text':
          schema = Yup.string();
          break;
        case 'Number':
          schema = Yup.number();
          break;
        case 'Binary':
          schema = Yup.string().matches(
            /^(https?:\/\/[^\s/$.?#].[^\s]*|ftp:\/\/[^\s/$.?#].[^\s]*|data:[a-zA-Z]+\/[a-zA-Z0-9.-]+;base64,[^\s]+)$/,
            'Invalid URL',
          );
          break;
        case 'Image':
          schema = Yup.string().matches(
            /^(https?:\/\/[^\s/$.?#].[^\s]*\.(?:jpg|jpeg|png|gif|bmp|webp|svg|tiff|tif|ico|heic|heif|avif)(?:\?[^\s]*)?|data:image\/[a-zA-Z]+;base64,[^\s]+)$/,
            'Invalid image URL',
          );
          break;
        case 'Audio':
          schema = Yup.string().matches(
            /^(https?:\/\/[^\s/$.?#].[^\s]*\.(?:mp3|wav|flac|aac|ogg|m4a|wma|aiff|alac|opus)(?:\?[^\s"']*)?|data:audio\/[a-zA-Z0-9.-]+;base64,[^\s]+)$/,
            'Invalid audio URL',
          );
          break;
        case 'Video':
          schema = Yup.string().matches(
            /^(https?:\/\/[^\s/$.?#].[^\s]*\.(?:mp4|mkv|mov|avi|wmv|flv|webm|m4v|3gp|ogg|ts|m3u8)(?:\?[^\s"']*)?|data:video\/[a-zA-Z0-9.-]+;base64,[^\s]+)$/,
            'Invalid video URL',
          );
          break;
        default:
          schema = Yup.string();
      }

      if (!input.optional) {
        schema = schema.required(`${input.name} is required`);
      }

      return {
        ...acc,
        [input.name]: schema,
      };
    }, {}),
  );
};

const DEFAULT_MODEL = 'gpt-4o-mini';

export const mapBotEmbodimentProperties = (properties: TChatBotProperties, activeAgent) => {
  const colors = properties?.colors;

  return {
    name: properties?.name || activeAgent?.name || '',
    introMessage: properties?.introMessage || '',
    chatGptModel: properties?.chatGptModel || DEFAULT_MODEL,
    syntaxHighlightTheme:
      properties?.syntaxHighlightTheme || SYNTAX_HIGHLIGHT_THEMES.find((m) => m.isDefault)?.name,
    personality: properties?.personality || activeAgent?.data?.description || '',
    icon: properties?.icon || '',
    colors: {
      botBubbleColors: {
        textColor: colors?.botBubbleColors?.textColor || DEFAULT_CHAT_COLORS.botTextColor,
        backgroundColorStart:
          colors?.botBubbleColors?.backgroundColorStart ||
          DEFAULT_CHAT_COLORS.botBubbleBackgroundColorStart,
        backgroundColorEnd:
          colors?.botBubbleColors?.backgroundColorEnd ||
          DEFAULT_CHAT_COLORS.botBubbleBackgroundColorEnd,
      },
      humanBubbleColors: {
        textColor: colors?.humanBubbleColors?.textColor || DEFAULT_CHAT_COLORS.humanTextColor,
        backgroundColorStart:
          colors?.humanBubbleColors?.backgroundColorStart ||
          DEFAULT_CHAT_COLORS.humanBubbleBackgroundColorStart,
        backgroundColorEnd:
          colors?.humanBubbleColors?.backgroundColorEnd ||
          DEFAULT_CHAT_COLORS.humanBubbleBackgroundColorEnd,
      },
      chatWindowColors: {
        backgroundColor:
          colors?.chatWindowColors?.backgroundColor ||
          DEFAULT_CHAT_COLORS.chatWindowBackgroundColor,
        headerBackgroundColor:
          colors?.chatWindowColors?.headerBackgroundColor ||
          DEFAULT_CHAT_COLORS.chatHeaderBackgroundColor,
        footerBackgroundColor:
          colors?.chatWindowColors?.footerBackgroundColor ||
          DEFAULT_CHAT_COLORS.chatFooterBackgroundColor,
      },
      chatTogglerColors: {
        backgroundColor:
          colors?.chatTogglerColors?.backgroundColor || DEFAULT_CHAT_COLORS.chatTogglerColor,
        textColor: colors?.chatTogglerColors?.textColor || DEFAULT_CHAT_COLORS.chatTogglerTextColor,
      },
      sendButtonColors: {
        backgroundColor:
          colors?.sendButtonColors?.backgroundColor ||
          DEFAULT_CHAT_COLORS.sendButtonBackgroundColor,
        textColor: colors?.sendButtonColors?.textColor || DEFAULT_CHAT_COLORS.sendButtonTextColor,
      },
    },

    allowedDomains: properties?.allowedDomains || [],
    isFullScreen: properties?.isFullScreen || false,
    allowFileAttachments: properties?.allowFileAttachments || false,
  };
};

export const mapFormPreviewEmbodimentProperties = (
  properties: TFormPreviewProperties,
  activeAgent,
) => {
  return {
    name: properties?.name || activeAgent?.name || '',
    allowedDomains: properties?.allowedDomains || [],
    outputPreview: properties?.outputPreview || false,
  };
};

export const mapVoiceEmbodimentProperties = (properties: TVoiceProperties, activeAgent) => {
  return {
    name: properties?.name || activeAgent?.name || '',
    allowedDomains: properties?.allowedDomains || [],
  };
};

export const mapGptEmbodimentProperties = (properties: TGptEmbodimentProperties, activeAgent) => {
  return {
    humanName: properties?.humanName || activeAgent?.name || '',
    modelName: properties?.modelName || activeAgent?.name || '',
    humanDescription: properties?.humanDescription || activeAgent?.data?.description || '',
    modelDescription: properties?.modelDescription || activeAgent?.data?.description || '',
    logoUrl: properties?.logoUrl || '',
    contactEmail: properties?.contactEmail || '',
    legalInfoUrl: properties?.legalInfoUrl || '',
  };
};

export function keysToLower(obj: Record<string, any>): Record<string, any> {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    newObj[key.toLowerCase()] = obj[key];
  });
  return newObj;
}

/**
 * Validates if a string is a valid URL
 * Uses URL constructor for parsing and additional checks for malformed URLs
 * @param url The URL string to validate
 * @returns boolean indicating if URL is valid
 */
export const isValidURL = (url: string): boolean => {
  try {
    // Basic cleanup
    url = url.trim();

    // Check for duplicated URLs
    const httpCount = (url.match(/https?:\/\//g) || []).length;
    if (httpCount > 1) return false;

    // If no protocol is specified, prepend https:// for validation
    const urlToTest = url.startsWith('http') ? url : `https://${url}`;
    const parsedUrl = new URL(urlToTest);

    // Additional validation checks
    // 1. Check for reasonable length
    if (urlToTest.length > 2048) return false;

    // 2. Check for valid hostname format
    const hostnameRegex =
      /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])(\.[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])*$/;

    if (!hostnameRegex.test(parsedUrl.hostname)) return false;
    return true;
  } catch {
    return false;
  }
};
