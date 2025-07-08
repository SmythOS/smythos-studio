import { Component } from './Component.class/index';

declare var Metro;
export class FunctionComponent extends Component {
  public redraw(triggerSettings = true) {
    //force disabling endpoint buttons
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addOutputButtonLabel = ' ';
    this.drawSettings.addInputButton = 'Input';
    this.drawSettings.addInputButtonLabel = 'Input';

    //let displayName = this.drawSettings.displayName || this.constructor.name;
    // if (!displayName.startsWith('F:')) {
    //     this.drawSettings.displayName = 'F:' + displayName;
    // }
    super.redraw(triggerSettings);

    const div = this.domElement as HTMLDivElement;

    div.classList.add('Function');
    return div;
  }
}
