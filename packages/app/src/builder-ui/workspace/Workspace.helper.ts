import { saveAs } from 'file-saver';
import { generateAgentTemplateId } from '../utils';

/**
 * This file contains helper methods designed to support the Workspace class.
 * Each method is invoked within the context of a Workspace instance, using the syntax: methodName.call(workspaceInstance)
 */

export function getTemplateInfo() {
  /* Template Information */
  const idElm = document.getElementById('agent-template-id-input') as HTMLInputElement;
  const nameElm = document.getElementById('agent-template-name-input') as HTMLInputElement;
  const descElm = document.getElementById('agent-template-description-input') as HTMLInputElement;
  const iconElm = document.getElementById('agent-template-icon-input') as HTMLInputElement;
  const categoryElm = document.getElementById('agent-template-category-input') as HTMLInputElement;
  const publishElm = document.getElementById('agent-template-publish-input') as HTMLInputElement;
  const colorElm = document.getElementById('agent-template-color-input') as HTMLInputElement;
  const imageUrlElm = document.getElementById('agent-template-image-url-input') as HTMLInputElement;
  const docLinkElm = document.getElementById('agent-template-doc-link-input') as HTMLInputElement;
  const videoLinkElm = document.getElementById(
    'agent-template-video-link-input',
  ) as HTMLInputElement;
  const valuePropositionElm = document.getElementById(
    'agent-template-value-proposition-input',
  ) as HTMLInputElement;

  const name = nameElm?.value || this.agent.name || 'Untitled';

  const id = idElm?.value || generateAgentTemplateId(name);

  const templateInfo = {
    id,
    name,
    description: descElm?.value || this.agent?.shortDescription || this.agent?.description || '',
    icon: iconElm?.value || '',
    category: categoryElm?.value || '',
    publish: publishElm?.checked || false,
    color: colorElm?.value || '#000000',
    imageUrl: imageUrlElm?.value || '',
    docLink: docLinkElm?.value || '',
    videoLink: videoLinkElm?.value || '',
    valueProposition: valuePropositionElm?.value || '',
  };

  return templateInfo;
}

// Save a template from the agent
export async function saveTemplate() {
  if (this.locked) return false;

  // When the agent is not loaded, we can't save
  if (!this.agent.id) return false;

  console.log('Template saving...');

  try {
    const data = await this.export();

    // we don't want to save the debugSessionEnabled flag in template file
    delete data.debugSessionEnabled;

    if (!data?.templateInfo) {
      const templateInfo = this.getTemplateInfo();
      data.templateInfo = templateInfo;
    }
    const templateId = data?.templateInfo?.id;

    await fetch('/api/enterprise/page/builder/agent-templates', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Save the templateInfo to the agent
    await this.saveAgent(this.agent?.name, this.agent?.domain, data);

    return templateId;
  } catch (error) {
    throw error;
  }
}

// Export the template only, so we don't need to save the agent
export async function exportTemplate() {
  if (this.locked) return false;

  // When the agent is not loaded, we can't export
  if (!this.agent.id) return false;

  console.log('Template exporting...');

  try {
    const exportedData = await this.export();
    const templateInfo = this.getTemplateInfo();
    const data = { ...exportedData, templateInfo };

    // Direct access to the textarea to get the latest value (as a fallback)
    try {
      // TODO: we need to fetch introMessage form setting api call
      const introMessageTextarea =
        (document.querySelector('textarea[name="introMessage"]') as HTMLTextAreaElement) ??
        `Hi, I'm ${this.agent.name || 'an AI Agent'}. How can I help you today?`;
      if (introMessageTextarea && !data?.introMessage) {
        // Set the introMessage from the textarea value if it's an HTMLTextAreaElement
        if (introMessageTextarea instanceof HTMLTextAreaElement) {
          data.introMessage = introMessageTextarea.value;
        } else {
          // If it's the fallback string, use that directly
          data.introMessage = introMessageTextarea;
        }
      }
    } catch (e) {
      console.error('Error trying to access introMessage textarea:', e);
    }

    // we don't want to save the debugSessionEnabled flag in template file
    delete data.debugSessionEnabled;

    const blob = new Blob([JSON.stringify(data)], { type: 'text/plain;charset=utf-8' });
    const templateId = data?.templateInfo?.id;

    saveAs(blob, `${templateId}.smyth`);

    return templateId;
  } catch (error) {
    console.error('Error exporting template:', error);
    throw error;
  }
}
