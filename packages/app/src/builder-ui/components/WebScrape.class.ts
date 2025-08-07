import { Component } from './Component.class';

export class WebScrape extends Component {
  protected async init() {
    this.settings = {
      // includeImages: {
      //   type: 'checkbox',
      //   label: 'Include Images Results',
      //   hint: 'Include images in the results',
      //   value: false,
      // },
      format: {
        type: 'select',
        label: 'Format',
        hint: 'Format of the results',
        value: 'markdown',
        options: [
          { text: 'Markdown', value: 'markdown' },
          { text: 'Markdown (Exclude images)', value: 'markdown:no_images' },
          { text: 'Markdown (Exclude links)', value: 'markdown:no_links' },
          { text: 'Raw', value: 'raw' },
          { text: 'Text', value: 'text' },
          { text: 'Clean HTML', value: 'clean_html' },
          { text: 'JSON', value: 'json' },
        ],
      },
      antiScrapingProtection: {
        type: 'checkbox',
        label: 'Bypass Anti-Bot Protection',
        help: 'Enable if the website is protected by bot detection methods like Captchas.',
        value: false,
      },
      javascriptRendering: {
        type: 'checkbox',
        label: 'Javascript Rendering',
        help: 'This will render the page using a headless browser and extract the text and images. Useful for websites that use javascript to load content.',
        value: false,
      },
      autoScroll: {
        type: 'checkbox',
        label: 'Auto Scroll',
        help: 'To automatically scroll the page till the bottom and extract the text and images. Useful for websites that load content on scroll.',
        value: false,
      },
    };

    const dataEntries = ['format', 'antiScrapingProtection', 'javascriptRendering', 'autoScroll'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    this.properties.defaultOutputs = ['Results', 'FailedURLs'];
    if (this.properties.inputs.length == 0)
      this.properties.inputs = ['URLs'];

    this.drawSettings.displayName = 'Web Scrape';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Extract text and images from URLs';
    this.drawSettings.shortDescription = 'Extract text and images from URLs';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }
}
