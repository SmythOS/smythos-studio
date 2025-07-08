import interact from 'interactjs';
import { Component } from './Component.class';
declare var Metro;
export class Note extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      description: {
        type: 'textarea',
        label: 'Description',
        value: '',
        help: "Add a note's text content to keep track of ideas, tasks, or reminders.",
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        hintPosition: 'bottom',
        validate: `maxlength=5000`,
        validateMessage: 'Your text exceeds the 5,000 character limit.',
        //helpUrl: '#',
      },
      textColor: {
        type: 'color',
        label: 'Text Color',
        class: 'w-full',
        value: '#000000',
        help: "Choose the color of the note's text to improve readability or match your style.",
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        hintPosition: 'bottom',
        events: {
          change: (e) => {
            this.domElement.style.color = e.target.value;
            const title: HTMLElement = this.domElement.querySelector('.title .text');
            if (title) title.style.color = e.target.value;
          },
        },
      },
      color: {
        type: 'color',
        label: 'Background Color',
        class: 'w-full',
        value: '#c7ff1529',
        help: 'Set the background color of the note to organize or highlight different types of information.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        events: {
          change: (e) => {
            this.domElement.style.backgroundColor = e.target.value;
          },
        },
      },
    };

    const dataEntries = ['color', 'textColor'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // Initialize _noteHeight if not already set
    if (!this.data._noteHeight && this.properties.height) {
      this.data._noteHeight = this.properties.height;
    }
    // #endregion

    // #region [ Output config ] ==================
    // this.outputSettings = { ...this.outputSettings, description: { type: 'string', default: '', editConfig: { type: 'textarea' } } };
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = [];
    this.properties.defaultInputs = [];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButton = null;
    this.drawSettings.componentDescription = '';

    this.drawSettings.shortDescription = '';
    this.drawSettings.color = '#ff00f2';
    // #endregion

    this.drawSettings.showSettings = true;

    // Ensure Note components maintain their z-index position
    if (this?.domElement?.style?.zIndex) {
      this.domElement.style.zIndex = '1'; // Default z-index if not set
    }

    setTimeout(() => {
      const title: HTMLElement = this.domElement?.querySelector('.title .text');
      // Ensure title color is only set on initial load and prevent setting again during copy/paste of component
      if (title && title.style.color !== (this.data.textColor || '#000')) {
        title.style.color = this.data.textColor || '#000'; // Set title color
      }
    }, 550);
  }
  protected async run(): Promise<any> {
    this.addEventListener('settingsSaved', (e) => {
      this.domElement.querySelector('.note-text').innerHTML = this.data.description;
      this.domElement.style.backgroundColor = this.data.color;
      this.domElement.style.borderColor = this.data.color;
      this.domElement.style.color = this.data.textColor;
      const title: HTMLElement = this.domElement.querySelector('.title .text');
      if (title) title.style.color = this.data.textColor;
    });
    return true;
  }
  public redraw(triggerSettings = false): HTMLDivElement {
    const div = super.redraw(triggerSettings);

    // Set background and text colors
    div.style.backgroundColor = this.data.color;
    div.style.borderColor = this.data.color;
    div.style.color = this.data.textColor;

    // Preserve z-index when redrawing
    if (!div.style.zIndex) {
      div.style.zIndex = '1';
    }

    // Apply stored dimensions if available
    if (this.properties.width) {
      div.style.width = this.properties.width;
    }

    // Apply height from either properties or stored data
    if (this.data._noteHeight) {
      div.style.height = this.data._noteHeight;
    } else if (this.properties.height) {
      div.style.height = this.properties.height;
      // Store for future reference
      this.data._noteHeight = this.properties.height;
    }

    const title: HTMLElement = div.querySelector('.title .text');
    if (title) title.style.color = this.data.textColor;

    div.querySelector('.title-bar .description').classList.add('hidden');
    div.querySelector('.title-bar .icon').classList.add('hidden');
    div.querySelector('.debug-bar').classList.add('hidden');
    div.querySelector('.ep-control.inputs').classList.add('hidden');
    div.querySelector('.ep-control.outputs').classList.add('hidden');
    div.querySelector('.input-container').classList.add('hidden');
    div.querySelector('.output-container').classList.add('hidden');
    div.querySelector('.button-container').classList.add('hidden');

    const text = document.createElement('pre');
    text.classList.add('note-text');
    text.innerHTML = this.data.description || '';

    div.appendChild(text);

    // Add resize handle for bottom-right corner
    const resizeHandle = document.createElement('div');
    resizeHandle.classList.add('resize-handle');
    div.appendChild(resizeHandle);

    // Add this to stop scroll propagation
    text.addEventListener('wheel', (event) => {
      event.stopPropagation();
    });

    // Configure interact.js for both horizontal and vertical resizing
    const component = this;
    const workspace = this.workspace;

    interact(div).resizable({
      edges: { left: false, right: true, bottom: true, top: false },
      listeners: {
        start(event) {
          if (workspace?.locked) return false;
          const pinnedElements = [...component.domElement.querySelectorAll('.pinned')];

          if (pinnedElements.length > 0) return false;
          component.domElement.classList.add('resizing');
        },
        move(event) {
          if (workspace?.locked) return false;
          const pinnedElements = [...component.domElement.querySelectorAll('.pinned')];

          if (pinnedElements.length > 0) return false;

          const target = event.target;
          // Set explicit width and height with px units
          const newWidth = Math.round(event.rect.width / workspace.scale) + 'px';
          const newHeight = Math.round(event.rect.height / workspace.scale) + 'px';

          target.style.width = newWidth;
          target.style.height = newHeight;

          // Store dimensions both in properties and data for preservation during import
          component.properties.width = newWidth;
          component.properties.height = newHeight;
          component.data._noteHeight = newHeight; // Store in data to bypass the import limitation

          component.repaint(false); // Passing false to avoid triggering saveAgent multiple times
        },
        end(event) {
          if (workspace?.locked) return false;
          const pinnedElements = [...component.domElement.querySelectorAll('.pinned')];

          if (pinnedElements.length > 0) return false;

          // Force an update of the height property
          const height = component.domElement.style.height;
          if (height) {
            component.properties.height = height;
            component.data._noteHeight = height; // Store in data to bypass the import limitation
          }

          component.repaint();
          setTimeout(() => {
            // Ensure the agent is saved with the updated properties
            component.workspace.saveAgent();
            component.domElement.classList.remove('resizing');
          }, 200);
        },
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 100, height: 50 },
        }),
      ],
      inertia: false,
    });

    return div;
  }

  /**
   * Override the addDebugButton method to prevent debug icons from appearing on Note components
   * Notes don't need debugging functionality as they are static content
   */
  public addDebugButton(): void {
    // Empty implementation to prevent debug button from being added
    return;
  }
}
