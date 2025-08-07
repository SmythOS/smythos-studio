import { LLM_PROVIDERS } from '../../constants';
import { delay } from '../../utils';

export const ImageSettingsConfig = {
  model({
    modelOptions,
    defaultModel,
    docUrl,
  }: {
    modelOptions: string[];
    defaultModel?: string;
    docUrl: string;
  }) {
    return {
      type: 'select',
      label: 'Model',
      hint: 'Model name',
      value: defaultModel,
      options: modelOptions,
      events: {
        change: async (event: MouseEvent) => {
          const currentElement = event?.target as HTMLInputElement;

          // #region Hide show pricing link for SmythOS models
          const formGroupElm = currentElement.closest('.form-group');
          const pricingLinkElm = formGroupElm?.querySelector(
            '.field-action-btn._model_pricing_link',
          );
          if (currentElement.value.startsWith('smythos/')) {
            pricingLinkElm?.classList?.remove('hidden');
          } else {
            pricingLinkElm?.classList?.add('hidden');
          }
          // #endregion
        },
      },
      actions: [
        {
          label: '$ View Pricing',
          icon: 'dollar-sign',
          classes: 'text-gray-600 top-[-8px] right-2 hover:underline _model_pricing_link hidden',
          tooltip: 'SmythOS charges based on input and output tokens',
          events: {
            click: () => {
              window.open(
                `${docUrl}/#/account_management/modelRates?id=image-generation`,
                '_blank',
              );
            },
          },
        },
      ],
    };
  },
  positivePrompt() {
    return {
      type: 'textarea',
      label: 'Prompt',
      validate: `required minlength=2 maxlength=2000`,
      validateMessage: `The length of the prompt must be between 2 and 2000 characters.`,
      class: 'mt-1',
      value: '{{InputText}}',
      attributes: { 'data-template-vars': 'true', 'data-supported-models': 'all' },
    };
  },
  negativePrompt({ section }: { section?: string } = {}) {
    return {
      type: 'textarea',
      label: 'Negative Prompt',
      validate: `maxlength=2000`,
      validateMessage: 'The length of the negative prompt must be less than 2000 characters.',
      value: '',
      hint: `A negative prompt is a text instruction to guide the model on generating the image. It is usually a sentence or a paragraph that provides negative guidance for the task. This parameter helps to avoid certain undesired results.\nFor example, if the negative prompt is "red dragon, cup", the model will follow the positive prompt but will avoid generating an image of a red dragon or including a cup. The more detailed the prompt, the more accurate the results.`,
      hintPosition: 'left',
      section,
    };
  },
  width({ section }: { section?: string } = {}) {
    return {
      type: 'number',
      label: 'Width',
      value: 1024,
      validate: `min=128 max=2048 custom=isValidImageDimension`,
      validateMessage:
        'Width must be between 128 and 2048 pixels and divisible by 64 (eg: 128...512, 576, 640...2048).',
      section,
    };
  },
  height({ section }: { section?: string } = {}) {
    return {
      type: 'number',
      label: 'Height',
      value: 1024,
      validate: `min=128 max=2048 custom=isValidImageDimension`,
      validateMessage:
        'Height must be between 128 and 2048 pixels and divisible by 64 (eg: 128...512, 576, 640...2048).',
      section,
    };
  },
  outputFormat({ section }: { section?: string } = {}) {
    return {
      type: 'select',
      label: 'Output Format',
      hint: 'Image output format',
      value: 'JPG',
      options: ['JPG', 'PNG', 'WEBP'],
      section,
    };
  },
  outputQuality({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Output Quality',
      value: 95,
      min: 20,
      max: 99,
      step: 1,
      hint: 'Sets the compression quality of the output image. Higher values preserve more quality but increase file size, lower values reduce file size but decrease quality.',
      hintPosition: 'left',
      section,
    };
  },
  numberResults({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Number of Results',
      value: 1,
      min: 1,
      max: 20,
      step: 1,
      section,
    };
  },
  strength({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Strength',
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      help: 'If the input includes an image attachment, a lower value results in more influence from the given image, while a higher value allows more creative deviation.',
      tooltipClasses: 'w-56 ',
      arrowClasses: '-ml-11',
      attributes: { 'data-supported-models': LLM_PROVIDERS.RUNWARE },
      section,
    };
  },
  steps({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Steps',
      value: 20,
      min: 1,
      max: 100,
      step: 1,
      help: `The number of steps is the number of iterations the model will perform to generate the image. The higher the number of steps, the more detailed the image will be. However, increasing the number of steps will also increase the time it takes to generate the image and may not always result in a better image (some schedulers work differently).\nWhen using your own models you can specify a new default value for the number of steps.`,
      tooltipClasses: 'w-56 ',
      arrowClasses: '-ml-11',
      section,
    };
  },
  backgroundColor({ section }: { section?: string } = {}) {
    return {
      type: 'color',
      label: 'Background Color',
      value: 'rgba(255, 255, 255, 0)',
      help: 'The background color of the image. The default value is white (rgba(255, 255, 255, 0)).',
      tooltipClasses: 'w-56 ',
      arrowClasses: '-ml-11',
      section,
    };
  },
  upscaleFactor({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Upscale Factor',
      helper: 'Upscale factor',
      tooltipClasses: 'w-36 ',
      arrowClasses: '-ml-11',
      value: 2,
      min: 2,
      max: 4,
      step: 1,
      section,
    };
  },
  confidence({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Confidence',
      value: 0.25,
      min: 0,
      max: 1,
      step: 0.1,
      section,
    };
  },
  maxDetections({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Max Detections',
      value: 6,
      min: 1,
      max: 20,
      step: 1,
      section,
    };
  },
  maskPadding({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Mask Padding',
      value: 4,
      min: 0,
      max: 100, // Guessed max value
      step: 1,
      section,
    };
  },
  maskBlur({ section }: { section?: string } = {}) {
    return {
      type: 'range',
      label: 'Mask Blur',
      value: 4,
      min: 0,
      max: 100, // Guessed max value
      step: 1,
      section,
    };
  },
  preProcessorType({ section }: { section?: string } = {}) {
    return {
      type: 'select',
      label: 'Pre Processor Type',
      options: [
        { text: 'Canny', value: 'canny' },
        { text: 'Depth', value: 'depth' },
        { text: 'Mlsd', value: 'mlsd' },
        { text: 'Normalbae', value: 'normalbae' },
        { text: 'Openpose', value: 'openpose' },
        { text: 'Tile', value: 'tile' },
        { text: 'Seg', value: 'seg' },
        { text: 'Lineart', value: 'lineart' },
        { text: 'Lineart Anime', value: 'lineart_anime' },
        { text: 'Shuffle', value: 'shuffle' },
        { text: 'Scribble', value: 'scribble' },
        { text: 'Softedge', value: 'softedge' },
      ],
      value: 'none',
      section,
    };
  },
  ipAdapters({ section }: { section?: string } = {}) {
    return {
      type: 'textarea',
      label: 'IP Adapters',
      value: '',
      hint: 'IP Adapters',
      hintPosition: 'left',
      section,
    };
  },
  ctaButton() {
    return {
      type: 'button',
      label: 'Generate',
      cls: 'rounded-lg px-4 py-1 h-[40px] text-white block ml-auto _image_comps_cta_btn',
      events: {
        click: async () => {
          const debugSwitch = document.querySelector('.debug-switcher') as HTMLButtonElement;
          const isDebugSwitcherOn = (document.getElementById('debug-menu-tgl') as HTMLInputElement)
            ?.checked;

          if (!isDebugSwitcherOn) {
            debugSwitch?.click();
          }

          // Add delay to ensure debug switch state change and debug button rendering are complete
          await delay(100);

          const activeComponentElm = document.querySelector(
            '.component.active',
          ) as HTMLButtonElement;
          const debugBtn = activeComponentElm.querySelector('.btn-debug') as HTMLButtonElement;
          debugBtn?.click();
        },
      },
    };
  },
};
