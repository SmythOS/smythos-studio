import { LLMFormController } from '../../helpers/LLMFormController.helper';
import { createBadge } from '../../ui/badges';
import { Component } from '../Component.class';
import { ImageSettingsConfig } from './imageSettings.config';
export class RestyleIPAdapter extends Component {
  private modelOptions: string[];
  private defaultModel: string;

  protected async prepare() {
    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures(['image-to-image']);

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
    this.modelOptions = modelOptions.filter((e) => e);

    return true;
  }

  protected async init() {
    this.settings = {
      positivePrompt: ImageSettingsConfig.positivePrompt(),
      model: ImageSettingsConfig.model({
        modelOptions: this.modelOptions,
        defaultModel: this.defaultModel,
        docUrl: this.workspace.serverData.docUrl,
      }),
      negativePrompt: ImageSettingsConfig.negativePrompt({ section: 'Advanced' }),
      width: ImageSettingsConfig.width({ section: 'Advanced' }),
      height: ImageSettingsConfig.height({ section: 'Advanced' }),
      outputFormat: ImageSettingsConfig.outputFormat({ section: 'Advanced' }),
      outputQuality: ImageSettingsConfig.outputQuality({ section: 'Advanced' }),
      numberResults: ImageSettingsConfig.numberResults({ section: 'Advanced' }),
      strength: ImageSettingsConfig.strength({ section: 'Advanced' }),
      ipAdapters: ImageSettingsConfig.ipAdapters({ section: 'Advanced' }),
      ctaButton: ImageSettingsConfig.ctaButton(),
    };

    const dataEntries = [
      'model',
      'positivePrompt',
      'negativePrompt',
      'width',
      'height',
      'outputFormat',
      'outputQuality',
      'numberResults',
      'strength',
      'ipAdapters',
    ];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultOutputs = ['Output'];

    this.properties.defaultInputs = ['Prompt', 'Image'];

    this.drawSettings.displayName = 'Restyle (IP Adapter)';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription =
      'Generate images by guiding the AI with a reference image.';
    this.drawSettings.shortDescription =
      'Generate images by guiding the AI with a reference image.';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }
}
