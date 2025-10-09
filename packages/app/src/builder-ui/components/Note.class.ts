import interact from 'interactjs';
import markdownit from 'markdown-it';
import { Component } from './Component.class';
declare var Metro;
export class Note extends Component {
  private markdownParser: any;

  protected async init() {
    // Initialize markdown parser with same config as ChatUI
    this.markdownParser = markdownit({
      html: true,        // Allow HTML tags
      linkify: true,     // Auto-convert URLs to links
      typographer: true, // Smart quotes, dashes, etc.
    });

    // --- MIGRATION LOGIC FOR OLD NOTES ---
    // If old fields exist, migrate to new model
    if (typeof this.data.formatting_mode === 'undefined') {
      let desc = this.data.description || '';
      let md = this.data.markdown_content || '';

      if (this.data.markdown_enabled) {
        this.data.formatting_mode = 'markdown';
        this.data.content = (desc && md) ? (desc.trim() + '\n\n' + md.trim()) : (md || desc);
      } else {
        this.data.formatting_mode = 'plaintext';
        this.data.content = desc || '';
      }
    }
    // Ensure content is always present
    if (typeof this.data.content === 'undefined') this.data.content = '';
    // Fallback to preserve old description if content is empty
    if (!this.data.content && this.data.description) {
      this.data.content = this.data.description;
    }
    // #region [ Settings config ] ==================
    this.settings = {
      formatting_mode: {
        type: 'dropdown',
        label: 'Formatting Mode',
        value: this.data.formatting_mode || 'plaintext',
        options: [
          { text: 'Plain Text', value: 'plaintext' },
          { text: 'Markdown', value: 'markdown' },
        ],
        help: 'Choose how your note content is formatted and displayed.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        hintPosition: 'bottom',
        events: {
          change: (e) => {
            // Don't update this.data directly - let the form save mechanism handle it
            // Just update the UI immediately for better UX
            this.updateNoteContent(e?.target?.value);
          },
        },
      },
      content: {
        type: 'textarea',
        label: 'Content',
        value: this.data.content || '',
        help: "Add your note's text or markdown content.",
        tooltipClasses: 'w-40',
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
        value: this.data.textColor || '#000000',
        help: "Choose the color of the note's text to improve readability or match your style.",
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        hintPosition: 'bottom',
        events: {
          change: (e) => {
            (e.target as HTMLElement).style.backgroundColor = e.target.value;
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
        value: this.data.color || '#c7ff1529',
        help: 'Set the background color of the note to organize or highlight different types of information.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        events: {
          change: (e) => {
            (e.target as HTMLElement).style.backgroundColor = e.target.value;
            this.domElement.style.backgroundColor = e.target.value;
          },
        },
      },
    };

    const dataEntries = ['color', 'textColor', 'formatting_mode', 'content'];
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

  private async markdownToggleHandler(e: Event): Promise<void> {
    const isEnabled = (e.target as HTMLInputElement).checked;
    const form = (e.target as HTMLElement).closest('form');
    if (!form) return;

    const markdownContentField = form.querySelector('.form-box[data-field-name="markdown_content"]');
    const textarea = markdownContentField?.querySelector('textarea') as HTMLTextAreaElement;
    if (!markdownContentField || !textarea) return;

    // Toggle field visibility and reset textarea
    markdownContentField.classList.toggle('hidden', !isEnabled);
    this.resetTextarea(textarea);

    if (!isEnabled) {
      this.data.markdown_content = '';
      this.removeMarkdownContent();
    }
  }

  private resetTextarea(textarea: HTMLTextAreaElement): void {
    textarea.value = '';
    textarea.style.height = '34px';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private removeMarkdownContent(): void {
    const markdownElement = this.domElement?.querySelector('.note-markdown');
    if (markdownElement) {
      markdownElement.remove();
    }
  }

  private renderMarkdownContent(): void {
    // Only render if markdown mode and content exists
    if (this.data.formatting_mode !== 'markdown' || !this.data.content?.trim()) {
      this.removeMarkdownContent();
      return;
    }
    // Clear existing markdown content
    const existingMarkdown = this.domElement?.querySelector('.note-markdown');
    if (existingMarkdown) {
      existingMarkdown.remove();
    }
    const contentWrapper = this.domElement?.querySelector('.note-content-wrapper');
    if (!contentWrapper) return;

    // Create and append markdown container (no separator line)
    const markdownDiv = document.createElement('div');
    markdownDiv.classList.add('note-markdown');
    markdownDiv.innerHTML = this.markdownParser.render(this.data.content);
    contentWrapper.appendChild(markdownDiv);
  }

  private updateNoteContent(formattingMode: string = 'plaintext'): void {
    const textEl = this.domElement.querySelector('.note-text');
    if (!textEl) return;

    if (formattingMode === 'markdown') {
      textEl.innerHTML = '';
      this.renderMarkdownContent();
    } else {
      this.removeMarkdownContent();
      textEl.textContent = this.data.content || '';
    }
  }

  private updateNoteStyles(): void {
    this.domElement.style.backgroundColor = this.data.color;
    this.domElement.style.borderColor = this.data.color;
    this.domElement.style.color = this.data.textColor;
    const title: HTMLElement = this.domElement.querySelector('.title .text');
    if (title) title.style.color = this.data.textColor;
  }

  private initializeSidebar(sidebar: Element): void {
    // Set color picker backgrounds
    const textColorInput = sidebar.querySelector('#textColor') as HTMLInputElement;
    const backgroundColorInput = sidebar.querySelector('#color') as HTMLInputElement;

    if (textColorInput && this.data.textColor) {
      textColorInput.style.backgroundColor = this.data.textColor;
    }
    if (backgroundColorInput && this.data.color) {
      backgroundColorInput.style.backgroundColor = this.data.color;
    }
  }

  protected async run(): Promise<any> {
    this.addEventListener('settingsSaved', (e) => {
      // The data has already been updated by the general save mechanism
      // We just need to update the UI to reflect the changes
      this.updateNoteContent(e?.formatting_mode);
      this.updateNoteStyles();
    });

    this.addEventListener('settingsOpened', (sidebar, component) => {
      if (component !== this) return;
      setTimeout(() => this.initializeSidebar(sidebar), 100);
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
    // Create a content wrapper to contain the content
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('note-content-wrapper');

    const text = document.createElement('pre');
    text.classList.add('note-text');

    if (this.data.formatting_mode === 'markdown') {
      text.innerHTML = '';
    } else {
      text.textContent = this.data.content || '';
    }
    contentWrapper.appendChild(text);
    div.appendChild(contentWrapper);
    // Render markdown content after the description text (no separator line)
    setTimeout(() => {
      this.renderMarkdownContent();
    }, 0);

    // Add resize handle for bottom-right corner
    const resizeHandle = document.createElement('div');
    resizeHandle.classList.add('resize-handle');
    div.appendChild(resizeHandle);

    // Add this to stop scroll propagation for regular scrolling, but allow zoom events to bubble up
    contentWrapper.addEventListener('wheel', (event) => {
      // If Ctrl/Cmd is held down, this is a zoom operation - let it bubble up to canvas
      if (event.ctrlKey || event.metaKey) {
        return; // Don't stop propagation, let the canvas handle the zoom
      }
      // Otherwise, this is regular scrolling within the note - stop propagation
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
