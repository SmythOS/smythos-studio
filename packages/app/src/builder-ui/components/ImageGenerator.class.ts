import { LLM_PROVIDERS } from '../constants';
import { LLMFormController } from '../helpers/LLMFormController.helper';
import { createBadge } from '../ui/badges';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';
import { ImageSettingsConfig } from './Image/imageSettings.config';

declare var Metro;

enum DALL_E_MODELS {
  DALL_E_2 = 'dall-e-2',
  DALL_E_3 = 'dall-e-3',
}

export class ImageGenerator extends Component {
  private modelOptions: string[];
  private defaultModel: string;
  private nanoBananaModels: string[];
  private imagenModels: string[];

  protected async prepare() {
    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures([
      'image-generation',
    ]);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

    const model = this.data.model || this.defaultModel;

    //prevent losing the previously set model
    if (model && ![...modelOptions.map((item) => item?.value || item)].includes(model)) {
      modelOptions.push({
        text: model + '&nbsp;&nbsp', // Add non-breaking space entities to create visual spacing between model name and badge
        value: model,
        badge: createBadge('Removed', 'text-smyth-red-500 border-smyth-red-500'),
      });
    }

    // TODO: set warning if the model is not available

    //remove undefined models
    this.modelOptions = modelOptions.filter((item) => {
      if (!item) return false;

      // Keep the currently selected model even if it's hidden
      if (item?.value === model) return true;

      // Otherwise, filter out hidden models
      return !item?.hidden;
    });

    this.nanoBananaModels = Object.keys(models).filter(isNanoBananaModel);
    this.imagenModels = Object.keys(models).filter(isImagenModel);

    return true;
  }

  protected async init() {
    this.settings = this.generateSettings();

    const dataEntries = [
      'model',
      'prompt',

      //#region Dall-E
      'sizeDalle2',
      'sizeDalle3',
      'quality',
      'style',
      /* 'numberOfImages', */
      'isRawInputPrompt',
      //#endregion

      //#region Runware
      'negativePrompt',
      'width',
      'height',
      'outputFormat',
      //#endregion

      //#region GPT
      'size',
      //#endregion

      //#region Google AI
      // 'numberOfImages', // More adjustments are needed because Imagen 4 Ultra supports only 1, while Imagen 4 can support up to 4.
      'aspectRatio',
      'resolution',
      'personGeneration',
      //#endregion
    ];

    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings?.[item]?.value;
    }

    // #region [ Inputs and outputs ] ==================
    if (this.properties.inputs.length == 0) this.properties.inputs = ['Prompt', 'Attachment'];

    const attachmentInputProps = this.properties.inputProps?.find((c) => c.name === 'Attachment');
    if (!attachmentInputProps) {
      this.properties.inputProps.push({ name: 'Attachment', type: 'Binary', optional: true });
    } else {
      attachmentInputProps.optional = true;
      attachmentInputProps.type = 'Binary';
    }
    // #endregion
    this.properties.defaultOutputs = ['Output'];

    this.drawSettings.displayName = 'Image Generator';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription =
      'Generate image from text descriptions using various AI image generation models';
    this.drawSettings.shortDescription = 'AI-powered text-to-image generation';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }

  private generateSettings() {
    return {
      model: {
        type: 'select',
        withoutSearch: true,
        label: 'Select a model',
        help: 'Choose a model that matches your style and detail needs.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        value: this.defaultModel,
        options: this.modelOptions,
        class: 'mb-6',
        actions: [
          {
            label: '$ View Pricing',
            icon: 'dollar-sign',
            classes: 'text-gray-600 top-[-8px] right-6 hover:underline _model_pricing_link hidden',
            tooltip: 'SmythOS charges based on input and output tokens',
            events: {
              click: () => {
                window.open(
                  `${this.workspace.serverData.docUrl}/account-management/model-rates/#image-generation`,
                  '_blank',
                );
              },
            },
          },
        ],
        events: {
          change: async (event: MouseEvent) => {
            this.modelChangeHandler(event.target as HTMLSelectElement);

            // Handle setting fields
            // ! DEPRECATED: will be removed
            // const currentElement = event?.target as HTMLInputElement;
            // if (currentElement.value === 'dall-e-3') {
            //   const dallE3OnlyFields = document.querySelectorAll(
            //     '.dall-e-3-only:not(.raw-input-prompt)',
            //   );
            //   const dallE2OnlyFields = document.querySelectorAll('.dall-e-2-only');
            //   const rawInputPrompt = document.querySelectorAll('.raw-input-prompt');

            //   dallE3OnlyFields?.forEach((field) => {
            //     const parent = field.closest('.form-group');
            //     parent.classList.remove('hidden');
            //   });
            //   dallE2OnlyFields?.forEach((field) => {
            //     const parent = field.closest('.form-group');
            //     parent.classList.add('hidden');
            //   });
            //   rawInputPrompt?.forEach((field) => {
            //     const parent = field.closest('.form-group');
            //     parent.classList.add('hidden');
            //   });
            // } else if (currentElement.value === 'dall-e-2') {
            //   const dallE3OnlyFields = document.querySelectorAll('.dall-e-3-only');
            //   const dallE2OnlyFields = document.querySelectorAll('.dall-e-2-only');
            //   dallE3OnlyFields.forEach((field) => {
            //     const parent = field.closest('.form-group');
            //     parent.classList.add('hidden');
            //   });
            //   dallE2OnlyFields.forEach((field) => {
            //     const parent = field.closest('.form-group');
            //     parent.classList.remove('hidden');
            //   });
            // }
          },
        },
      },
      prompt: {
        type: 'textarea',
        expandable: true,
        label: 'Prompt',
        validate: `required minlength=2 maxlength=2000`,
        validateMessage: `The length of the prompt must be between 2 and 2000 characters.`,
        class: 'mt-1',
        value: '{{Prompt}}',
        help: 'Describe what to generate by describing the subject, style, and constraints. <a href="https://smythos.com/docs/agent-studio/components/base/image-generator/?utm_source=studio&utm_medium=tooltip&utm_campaign=image-generator&utm_content=prompt#step-2-define-inputs" target="_blank" class="text-blue-600 hover:text-blue-800">See prompt tips</a>',
        tooltipClasses: 'w-56',
        attributes: {
          'data-template-vars': 'true',
          'data-template-excluded-vars': 'Attachment',
          'data-template-excluded-var-types': 'Binary',
          'data-supported-models': 'all',
        },
      },
      quality: {
        type: 'select',
        withoutSearch: true,
        label: 'Quality',
        help: 'Decide how detailed the output is, trading off speed and cost.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-15',
        value: '', // We need to keep this empty as 'standard' is not supported for other models like GPT Image 1
        options: [
          { text: 'Standard', value: 'standard' },
          { text: 'HD', value: 'hd' },
        ],
        // cls: 'dall-e-3-only', // ! DEPRECATED: will be removed
        section: 'Advanced',
        attributes: {
          'data-supported-models': `${DALL_E_MODELS.DALL_E_3}, ${getGPTModels().join(',')}`,
        },
      },

      outputFormat: {
        type: 'select',
        withoutSearch: true,
        label: 'Output Format',
        help: "Set the file type you'll get back, like JPEG for photos, PNG for transparency, or WebP for web use.",
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        value: 'JPEG',
        options: ['JPEG', 'PNG', 'WEBP'],
        section: 'Advanced',
        attributes: {
          'data-supported-models': `${LLM_PROVIDERS.RUNWARE}, ${getGPTModels().join(',')}`,
        },
      },

      ...getDallESettings(this.data),
      ...getRunwareSettings(this.data),
      ...getGPTSettings(this.data),
      ...getGoogleAISettings(this.data, this.nanoBananaModels, this.imagenModels),
    };
  }

  protected async run() {
    this.addEventListener('settingsOpened', this.handleSettingsOpened.bind(this));
  }

  private async handleSettingsOpened(sidebar, component) {
    if (component !== this) return;

    const form = sidebar.querySelector('form');
    const modelSelect = form?.querySelector('#model') as HTMLSelectElement;
    if (modelSelect) {
      await delay(100);
      redrawSelectBoxesByModel(modelSelect.value, this.data);
    }
  }

  modelChangeHandler(target: HTMLSelectElement) {
    /* We need to regenerate settings (this.settings) to sync with updated fields info
      Otherwise, old values will be saved when we update field information during switching models. */
    this.settings = this.generateSettings();

    LLMFormController.toggleFields(target);

    delay(100).then(() => {
      const selectedModel = target.value;
      redrawSelectBoxesByModel(selectedModel, this.data);
    });
  }
}

// #region model specific settings
function getGPTSettings(savedData: Record<string, string>) {
  return {
    size: {
      type: 'select',
      label: 'Size',
      help: 'Choose the image size: 1024×1024 for square (1:1), 1536×1024 for landscape, or 1024×1536 for portrait orientation.',
      tooltipClasses: 'w-56 ',
      withoutSearch: true,
      arrowClasses: '-ml-15',
      value: savedData.size || 'auto',
      options: [
        { text: 'Auto', value: 'auto' },
        { text: '1024x1024', value: '1024x1024' },
        { text: '1536x1024 (landscape)', value: '1536x1024' },
        { text: '1024x1536 (portrait)', value: '1024x1536' },
      ],
      section: 'Advanced',
      attributes: { 'data-supported-models': getGPTModels().join(',') },
    },
  };
}

function getRunwareSettings(savedData: Record<string, string>) {
  return {
    strength: ImageSettingsConfig.strength({ section: 'Advanced' }),
    negativePrompt: {
      type: 'textarea',
      expandable: true,
      label: 'Negative Prompt',
      validate: `maxlength=2000`,
      validateMessage: 'The length of the negative prompt must be less than 2000 characters.',
      value: savedData.negativePrompt || '',
      section: 'Advanced',
      attributes: { 'data-supported-models': LLM_PROVIDERS.RUNWARE },
      help: 'Block unwanted elements, styles, or colors from appearing in the image.',
      tooltipClasses: 'w-56 ',
      arrowClasses: '-ml-11',
    },
    width: {
      type: 'number',
      label: 'Width',
      value: savedData.width || 1024,
      section: 'Advanced',
      attributes: { 'data-supported-models': LLM_PROVIDERS.RUNWARE },
      validate: `min=128 max=2048 custom=isValidImageDimension`,
      validateMessage:
        'Width must be between 128 and 2048 pixels and divisible by 64 (eg: 128...512, 576, 640...2048).',
    },
    height: {
      type: 'number',
      label: 'Height',
      value: savedData.height || 1024,
      section: 'Advanced',
      attributes: { 'data-supported-models': LLM_PROVIDERS.RUNWARE },
      validate: `min=128 max=2048 custom=isValidImageDimension`,
      validateMessage:
        'Height must be between 128 and 2048 pixels and divisible by 64 (eg: 128...512, 576, 640...2048).',
    },
  };
}

function getDallESettings(savedData: Record<string, string>) {
  return {
    // * for backward compatibility we need to keep both sizeDalle2 and sizeDalle3
    sizeDalle2: {
      type: 'select',
      label: 'Size',
      withoutSearch: true,
      help: 'Pick the image size based on aspect ratio: 1024×1024 for square (1:1), 1536×1024 for landscape, or 1024×1536 for portrait orientation.',
      tooltipClasses: 'w-56 ',
      arrowClasses: '-ml-11',
      value: savedData.sizeDalle2 || '256x256',
      options: ['256x256', '512x512', '1024x1024'],
      // cls: 'dall-e-2-only', // ! DEPRECATED: will be removed
      section: 'Advanced',
      attributes: { 'data-supported-models': DALL_E_MODELS.DALL_E_2 },
    },
    sizeDalle3: {
      type: 'select',
      withoutSearch: true,
      label: 'Size',
      help: 'Pick the image size based on aspect ratio: 1024×1024 for square (1:1), 1792×1024 for landscape, or 1024×1792 for portrait orientation.',
      tooltipClasses: 'w-56 ',
      arrowClasses: '-ml-11',

      value: savedData.sizeDalle3 || '1024x1024',
      options: ['1024x1024', '1792x1024', '1024x1792'],
      // cls: 'dall-e-3-only', // ! DEPRECATED: will be removed
      section: 'Advanced',
      attributes: { 'data-supported-models': DALL_E_MODELS.DALL_E_3 },
    },
    style: {
      type: 'select',
      withoutSearch: true,
      label: 'Style',
      help: 'Image style',
      value: savedData.style || 'vivid',
      options: ['vivid', 'natural'],
      // cls: 'dall-e-3-only', // ! DEPRECATED: will be removed
      section: 'Advanced',
      attributes: { 'data-supported-models': DALL_E_MODELS.DALL_E_3 },
    },
    isRawInputPrompt: {
      type: 'checkbox',
      label: 'Keep the Prompt as it is',
      value: savedData.isRawInputPrompt || false,
      help: 'I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS.',
      tooltipClasses: 'w-56 ',
      arrowClasses: '-ml-11',
      // cls: 'dall-e-3-only raw-input-prompt', // ! DEPRECATED: will be removed
      section: 'Advanced',
      attributes: {
        'data-supported-models': `${DALL_E_MODELS.DALL_E_3}, ${DALL_E_MODELS.DALL_E_2}`,
      },
    },
  };
}

function getGoogleAISettings(
  savedData: Record<string, any>,
  nanoBananaModels: string[],
  imagenModels: string[],
) {
  const allGoogleAIImageModels = [...nanoBananaModels, ...imagenModels];

  return {
    aspectRatio: {
      type: 'select',
      withoutSearch: true,
      label: 'Aspect Ratio',
      help: 'Set the shape of the image, like square (1:1) or widescreen (16:9).',
      tooltipClasses: 'w-56',
      arrowClasses: '-ml-11',
      value: savedData.aspectRatio || '1:1',
      // Default options shown initially (Imagen); will be updated by redrawSelectBoxesByModel on model change
      options: IMAGEN_ASPECT_RATIOS,
      section: 'Advanced',
      attributes: {
        // Show for all Google AI image models; fall back to provider if model lists not yet loaded
        'data-supported-models':
          allGoogleAIImageModels.length > 0
            ? allGoogleAIImageModels.join(',')
            : LLM_PROVIDERS.GOOGLEAI,
      },
    },
    resolution: {
      type: 'select',
      withoutSearch: true,
      label: 'Output Size',
      help: 'Set the resolution of the generated image.',
      tooltipClasses: 'w-56',
      arrowClasses: '-ml-11',
      value: savedData.resolution || '1K',
      // Default options; will be updated by redrawSelectBoxesByModel (0.5K added for 3.1 Flash)
      options: [
        { text: '1K', value: '1K' },
        { text: '2K', value: '2K' },
        { text: '4K', value: '4K' },
      ],
      section: 'Advanced',
      attributes: {
        'data-supported-models': nanoBananaModels.join(','),
      },
    },
    personGeneration: {
      type: 'select',
      withoutSearch: true,
      label: 'Person Generation',
      help: 'Control if people can appear and which age groups are included. <a href="https://smythos.com/docs/agent-studio/components/base/image-generator/?utm_source=studio&utm_medium=tooltip&utm_campaign=image-generator&utm_content=person-generation#model-verification-and-troubleshooting" target="_blank" class="text-blue-600 hover:text-blue-800">See prompt tips</a>',
      tooltipClasses: 'w-56',
      arrowClasses: '-ml-11',
      value: savedData.personGeneration || 'dont_allow',
      options: [
        { text: "Don't Allow", value: 'dont_allow' },
        { text: 'Allow Adult', value: 'allow_adult' },
        { text: 'Allow All', value: 'allow_all' },
      ],
      section: 'Advanced',
      attributes: {
        // Only Imagen models support personGeneration (not Nano Banana native generation models)
        'data-supported-models':
          imagenModels.length > 0 ? imagenModels.join(',') : LLM_PROVIDERS.GOOGLEAI,
      },
    },
  };
}
// #endregion

// #region redraw logic of select boxes based on the model
enum MODEL_FAMILY {
  GPT = 'gpt',
  RUNWARE = 'runware',
  DALL_E = 'dall-e',
  NANO_BANANA = 'nano-banana', // Gemini native image generation models
  IMAGEN = 'imagen', // Google Imagen models
}

/**
 * Standard aspect ratios shared by most Nano Banana models
 * (e.g. Gemini 2.5 Flash Image, Gemini 3 Pro Image Preview).
 */
const NANO_BANANA_ASPECT_RATIOS = [
  { text: 'Square (1:1)', value: '1:1' },
  { text: 'Photo Portrait (2:3)', value: '2:3' },
  { text: 'Photo Landscape (3:2)', value: '3:2' },
  { text: 'Portrait (3:4)', value: '3:4' },
  { text: 'Standard (4:3)', value: '4:3' },
  { text: 'Social Portrait (4:5)', value: '4:5' },
  { text: 'Classic Print (5:4)', value: '5:4' },
  { text: 'Vertical (9:16)', value: '9:16' },
  { text: 'Widescreen (16:9)', value: '16:9' },
  { text: 'Cinematic (21:9)', value: '21:9' },
];

/**
 * Extended aspect ratios exclusively available on Gemini 3.1 Flash Image models.
 * Includes extreme ratios (1:4, 1:8, 4:1, 8:1) not supported by other models.
 */
const NANO_BANANA_EXTENDED_ASPECT_RATIOS = [
  { text: 'Square (1:1)', value: '1:1' },
  { text: 'Tall Banner (1:4)', value: '1:4' },
  { text: 'Skyscraper (1:8)', value: '1:8' },
  { text: 'Photo Portrait (2:3)', value: '2:3' },
  { text: 'Photo Landscape (3:2)', value: '3:2' },
  { text: 'Portrait (3:4)', value: '3:4' },
  { text: 'Banner (4:1)', value: '4:1' },
  { text: 'Standard (4:3)', value: '4:3' },
  { text: 'Social Portrait (4:5)', value: '4:5' },
  { text: 'Classic Print (5:4)', value: '5:4' },
  { text: 'Panoramic (8:1)', value: '8:1' },
  { text: 'Vertical (9:16)', value: '9:16' },
  { text: 'Widescreen (16:9)', value: '16:9' },
  { text: 'Cinematic (21:9)', value: '21:9' },
];

/** Aspect ratio options for Imagen models. */
const IMAGEN_ASPECT_RATIOS = [
  { text: 'Square (1:1)', value: '1:1' },
  { text: 'Vertical (9:16)', value: '9:16' },
  { text: 'Widescreen (16:9)', value: '16:9' },
  { text: 'Portrait (3:4)', value: '3:4' },
  { text: 'Standard (4:3)', value: '4:3' },
];

const models = window['__LLM_MODELS__'] || {};

/**
 * Updates the select boxes based on the selected model
 * @param model The selected model identifier
 * @param savedData The component data
 */
function redrawSelectBoxesByModel(model: string, savedData: Record<string, any>): void {
  const modelFamily = getModelFamily(model);
  if (!modelFamily) return;

  const config = MODEL_SELECT_BOX_CONFIGS[modelFamily];
  if (!config) return;

  // Iterate through all config properties (quality, outputFormat, aspectRatio, etc.)
  const configProperties = Object.keys(config) as Array<keyof ModelSelectBoxConfig>;

  for (const propName of configProperties) {
    const propConfig = config[propName];
    if (!propConfig) continue;

    redrawSelectBox({
      name: propName,
      options: propConfig.options,
      value: savedData[propName] || propConfig.defaultValue,
    });
  }

  // For Nano Banana models, override model-specific options
  if (modelFamily === MODEL_FAMILY.NANO_BANANA) {
    // resolution: 0.5K available only for 3.1 Flash
    const resolutionOptions = getNanoBananaResolutionOptions(model);
    const currentSize = savedData.resolution;
    const isValidSize = resolutionOptions.some((opt) => opt.value === currentSize);
    redrawSelectBox({
      name: 'resolution',
      options: resolutionOptions,
      value: isValidSize ? currentSize : resolutionOptions[0].value,
    });

    // aspectRatio: 3.1 Flash supports extended ratios; others use the standard set
    const aspectRatioOptions = getNanoBananaAspectRatioOptions(model);
    const currentRatio = savedData.aspectRatio;
    const isValidRatio = aspectRatioOptions.some((opt) => opt.value === currentRatio);
    redrawSelectBox({
      name: 'aspectRatio',
      options: aspectRatioOptions,
      value: isValidRatio ? currentRatio : aspectRatioOptions[0].value,
    });
  }
}

function redrawSelectBox({
  name,
  options,
  value,
}: {
  name: string;
  options: string[] | { text: string; value: string }[];
  value?: string;
}) {
  const field = document.getElementById(name) as HTMLSelectElement;
  if (!field) return;

  const selectElem = Metro.getPlugin(field, 'select');
  selectElem.removeOptions([...selectElem?.elem?.options].map((o) => o.value)); //remove all options
  options.forEach((option) => {
    const _text = option?.text || option;
    const _value = option?.value || option;
    const _selected = value == _value;
    selectElem.addOption(_value, _text, _selected);
  });
}

/**
 * Configuration mapping for model-specific select box options
 */
interface ModelSelectBoxConfig {
  quality?: {
    options: string[] | { text: string; value: string }[];
    defaultValue: string;
  };
  outputFormat?: {
    options: string[] | { text: string; value: string }[];
    defaultValue: string;
  };
  aspectRatio?: {
    options: { text: string; value: string }[];
    defaultValue: string;
  };
}

/**
 * Model configuration registry mapping model types to their specific configurations
 */
const MODEL_SELECT_BOX_CONFIGS: Record<string, ModelSelectBoxConfig> = {
  [MODEL_FAMILY.GPT]: {
    quality: {
      options: [
        { text: 'Auto', value: 'auto' },
        { text: 'High', value: 'high' },
        { text: 'Medium', value: 'medium' },
        { text: 'Low', value: 'low' },
      ],
      defaultValue: 'auto',
    },
    outputFormat: {
      options: [
        { text: 'JPEG', value: 'jpeg' },
        { text: 'PNG', value: 'png' },
        { text: 'WEBP', value: 'webp' },
      ],
      defaultValue: 'png',
    },
  },
  [MODEL_FAMILY.RUNWARE]: {
    outputFormat: {
      options: ['JPEG', 'PNG', 'WEBP'],
      defaultValue: 'JPEG',
    },
  },
  [MODEL_FAMILY.DALL_E]: {
    quality: {
      options: [
        { text: 'Standard', value: 'standard' },
        { text: 'HD', value: 'hd' },
      ],
      defaultValue: 'standard',
    },
  },
  [MODEL_FAMILY.NANO_BANANA]: {
    aspectRatio: {
      options: NANO_BANANA_ASPECT_RATIOS,
      defaultValue: '1:1',
    },
    // resolution is handled separately in redrawSelectBoxesByModel (options differ per model)
  },
  [MODEL_FAMILY.IMAGEN]: {
    aspectRatio: {
      options: IMAGEN_ASPECT_RATIOS,
      defaultValue: '1:1',
    },
  },
};

/**
 * Gets the model family from a model identifier
 * @param model The model identifier
 * @returns The model family or null if not recognized
 */
function getModelFamily(model: string): string | null {
  if (isGPTModel(model)) return MODEL_FAMILY.GPT;
  if (isRunwareModel(model)) return MODEL_FAMILY.RUNWARE;
  if (isDallEModel(model)) return MODEL_FAMILY.DALL_E;
  if (isNanoBananaModel(model)) return MODEL_FAMILY.NANO_BANANA;
  if (isGoogleAIModel(model)) return MODEL_FAMILY.IMAGEN;

  return null;
}

/**
 * Returns true for Gemini native image generation models (Nano Banana family).
 * These models have "gemini" and "image" in their ID.
 */
function isNanoBananaModel(model: string): boolean {
  const cleanModel = model.replace('smythos/', '').toLowerCase();
  return isGoogleAIModel(model) && cleanModel.includes('gemini') && cleanModel.includes('image');
}

/**
 * Returns true for Google Imagen models (imagegeneration / imagen in ID).
 */
function isImagenModel(model: string): boolean {
  const cleanModel = model.replace('smythos/', '').toLowerCase();
  return (
    isGoogleAIModel(model) &&
    (cleanModel.includes('imagen') || cleanModel.includes('imagegeneration'))
  );
}

/**
 * Returns the resolution select options for a given Nano Banana model.
 * 0.5K is available exclusively for the Gemini 3.1 Flash image model.
 */
function getNanoBananaResolutionOptions(model: string): { text: string; value: string }[] {
  const baseOptions = [
    { text: '1K', value: '1K' },
    { text: '2K', value: '2K' },
    { text: '4K', value: '4K' },
  ];
  if (/3\.1.*flash.*image/i.test(model.replace('smythos/', ''))) {
    return [{ text: '0.5K', value: '0.5K' }, ...baseOptions];
  }
  return baseOptions;
}

/**
 * Returns the aspect ratio options for a given Nano Banana model.
 * Gemini 3.1 Flash Image supports extended ratios (1:4, 1:8, 4:1, 8:1);
 * all other Nano Banana models use the standard 10-ratio set.
 */
function getNanoBananaAspectRatioOptions(model: string): { text: string; value: string }[] {
  if (/3\.1.*flash.*image/i.test(model.replace('smythos/', ''))) {
    return NANO_BANANA_EXTENDED_ASPECT_RATIOS;
  }
  return NANO_BANANA_ASPECT_RATIOS;
}

function isGPTModel(model: string) {
  return model?.replace('smythos/', '')?.startsWith(MODEL_FAMILY.GPT);
}

function isRunwareModel(model: string): boolean {
  return Object.entries(models).some(
    ([key, value]) =>
      key === model && (value as { provider: string }).provider === LLM_PROVIDERS.RUNWARE,
  );
}

function isDallEModel(model: string) {
  return model?.replace('smythos/', '')?.startsWith(MODEL_FAMILY.DALL_E);
}

function isGoogleAIModel(model: string): boolean {
  return Object.entries(models).some(
    ([key, value]) =>
      key === model &&
      ((value as { provider: string }).provider === LLM_PROVIDERS.GOOGLEAI ||
        (value as { llm: string }).llm === LLM_PROVIDERS.GOOGLEAI),
  );
}

// #endregion

// #region Other helper functions
function getGPTModels() {
  return Object.keys(models).filter((key) => isGPTModel(key));
}
// #endregion
