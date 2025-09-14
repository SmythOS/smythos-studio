import { Component } from '../Component.class';

export class Trigger extends Component {
  protected async init() {
    this.settings = {};

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['_'];
    this.properties.defaultInputs = [];
    // #endregion

    // #region [ Draw config ] ==================

    this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButtonLabel = '';
    this.drawSettings.addInputButtonLabel = '';
    this.drawSettings.componentDescription = 'Trigger';

    this.drawSettings.shortDescription = 'Trigger';
    this.drawSettings.color = '#ff00f2';
    // #endregion
  }
}
