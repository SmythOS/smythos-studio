import { Component } from '../Component.class';
import { ImageSettingsConfig } from './imageSettings.config';

export class RestyleControlNet extends Component {
  protected async init() {
    this.settings = {
      preProcessorType: ImageSettingsConfig.preProcessorType(),
      width: ImageSettingsConfig.width({ section: 'Advanced' }),
      height: ImageSettingsConfig.height({ section: 'Advanced' }),
      outputFormat: ImageSettingsConfig.outputFormat({ section: 'Advanced' }),
      outputQuality: ImageSettingsConfig.outputQuality({ section: 'Advanced' }),
      ctaButton: ImageSettingsConfig.ctaButton(),
    };

    const dataEntries = ['width', 'height', 'outputFormat', 'outputQuality', 'preProcessorType'];

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

    this.drawSettings.displayName = 'Restyle (ControlNet)';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription =
      'Generate images with precise control using a reference image and specific conditions.';
    this.drawSettings.shortDescription =
      'Generate images with precise control using a reference image and specific conditions.';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }
}
