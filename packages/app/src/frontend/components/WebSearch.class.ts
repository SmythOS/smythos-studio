import { Component } from './Component.class';

export class WebSearch extends Component {
  protected async init() {
    this.settings = {
      sourcesLimit: {
        type: 'number',
        label: 'Sources Limit',
        help: 'The maximum number of search results to return. Ceiling is 20.',
        value: 4,
        validate: 'min=1 max=20',
      },
      searchTopic: {
        type: 'select',
        label: 'Search Topic',
        value: 'general',
        options: ['general', 'news'],
        help: `This will optimize the search for the selected topic. Currently, only supports &#34;general&#34; and &#34;news&#34; (default: &#34;general&#34;).`,
      },
      includeQAs: {
        type: 'checkbox',
        label: 'Include Questions and Answers',
        help: 'If selected, includes a rich summary based on the information found in the results. Response time will be longer if selected.',
        value: false,
      },
      includeImages: {
        type: 'checkbox',
        label: 'Include Image Results',
        help: 'If selected, includes public images relevant to the query.',
        value: false,
      },
      timeRange: {
        type: 'select',
        label: 'Time Range',
        value: 'None',
        options: ['None', 'day', 'week', 'month', 'year'],
        help: '[Optional] Select the time range to filter the search results.',
      },
      includeRawContent: {
        type: 'checkbox',
        label: 'Include Raw Content',
        help: 'If selected, returns the parsed html content for each source.',
        value: true,
      },
      excludeDomains: {
        type: 'textarea',
        label: 'Exclude Domains',
        help: 'A list of domains to exclude from search results. Separate multiple domains with a comma.',
        value: '',
      },
    };

    const dataEntries = ['sourcesLimit', 'searchTopic', 'includeQAs', 'includeImages', 'timeRange', 'includeRawContent', 'excludeDomains'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    this.properties.defaultOutputs = ['Results', 'Images', 'Answer'];
    this.properties.defaultInputs = ['SearchQuery'];

    this.drawSettings.displayName = 'Web Search';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Fetch web results from a query';
    this.drawSettings.shortDescription = 'Fetch web results from a query';
    this.drawSettings.color = '#65a698';
    this._ready = true;
  }

}
