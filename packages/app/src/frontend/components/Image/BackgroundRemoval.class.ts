import { Component } from '../Component.class';
import { ImageSettingsConfig } from './imageSettings.config';

export class BackgroundRemoval extends Component {
  protected async init() {
    this.settings = {
      outputFormat: ImageSettingsConfig.outputFormat(),
      outputQuality: ImageSettingsConfig.outputQuality(),
      backgroundColor: ImageSettingsConfig.backgroundColor(),
      ctaButton: ImageSettingsConfig.ctaButton(),
    };

    const dataEntries = ['outputFormat', 'outputQuality', 'backgroundColor'];

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

    this.drawSettings.displayName = 'Background Removal';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Removes background from image to isolate subject.';
    this.drawSettings.shortDescription = 'Removes background from image to isolate subject.';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }
}
