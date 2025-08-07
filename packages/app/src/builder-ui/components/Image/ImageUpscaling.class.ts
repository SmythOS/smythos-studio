import { Component } from '../Component.class';
import { ImageSettingsConfig } from './imageSettings.config';

export class ImageUpscaling extends Component {
  protected async init() {
    this.settings = {
      upscaleFactor: ImageSettingsConfig.upscaleFactor({ section: 'Advanced' }),
      outputFormat: ImageSettingsConfig.outputFormat(),
      outputQuality: ImageSettingsConfig.outputQuality(),
      ctaButton: ImageSettingsConfig.ctaButton(),
    };

    const dataEntries = ['outputFormat', 'outputQuality', 'upscaleFactor'];

    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultOutputs = ['Output'];

    this.properties.defaultInputs = ['InputImage'];
    const inputImageProps = this.properties.inputProps?.find((c) => c.name === 'InputImage');
    if (!inputImageProps) {
      this.properties.inputProps.push({ name: 'InputImage', type: 'Binary', optional: false });
    } else {
      inputImageProps.optional = false;
      inputImageProps.type = 'Binary';
    }

    this.drawSettings.displayName = 'Image Upscaling';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription =
      'Enhances image resolution, improving quality and sharpness.';
    this.drawSettings.shortDescription =
      'Enhances image resolution, improving quality and sharpness.';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }
}
