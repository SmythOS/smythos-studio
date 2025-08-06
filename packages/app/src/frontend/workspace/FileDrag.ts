import { confirm, alert } from '../ui/dialogs';
import { uid } from '../utils';
export async function importPostman(workspace, jsonData, dropX, dropY) {
  const result = parsePostman(jsonData);
  //console.log(JSON.stringify(result));

  const confirmPostmanImport = await confirm(
    'Postman Collection Detected',
    'Do you want to import the Postman collection?',
    {
      btnYesLabel: 'Yes, Import',
      btnNoLabel: 'No, Cancel',
    },
  );
  if (!confirmPostmanImport) return;
  // Reset all components to default state
  workspace.refreshComponentSelection();
  workspace.clipboard.pasteSelection(JSON.stringify(result), dropX, dropY);
  workspace.redraw();
}

export async function importSmythFile(workspace, jsonData, bypassContentCheck = false) {
  const components = [...workspace.domElement.querySelectorAll('.component')];
  if (components.length > 0 && !bypassContentCheck) {
    await alert(
      'Please clear the workspace before importing a Smyth Agent file.',
      'Workspace not empty',
    );
    return;
  }

  if (!bypassContentCheck) {
    const confirmAgentImport = await confirm(
      'Smyth Agent File Detected',
      'Do you want to import it ?',
      {
        btnYesLabel: 'Yes, Import',
        btnNoLabel: 'No, Cancel',
      },
    );
    if (!confirmAgentImport) return;
  }

  // Remove team ID from the agent
  delete jsonData?.teamId;

  await workspace.import(jsonData);
  workspace.agent.name =
    jsonData.name || jsonData.templateInfo?.name || workspace.agent.name || 'Untitled Agent';
  workspace.agent.description = jsonData.description;
  workspace.agent.data.description = jsonData.description;
  workspace.agent.data.templateInfo = jsonData.templateInfo;
  workspace.agent.shortDescription = jsonData.shortDescription;
  workspace.agent.data.shortDescription = jsonData.shortDescription;
  workspace.agent.behavior = jsonData.behavior;
  workspace.agent.data.behavior = jsonData.behavior;
  workspace.agent.variables = jsonData.variables || {};
  workspace.agent.data.variables = jsonData.variables || {};
  workspace.agent.introMessage = jsonData.introMessage;
  workspace.agent.data.introMessage = jsonData.introMessage;

  // Save the agent and emit the agentUpdated event
  await workspace.saveAgent(jsonData.name, '', jsonData);

  // Explicitly emit the agentUpdated event
  workspace.emit('agentUpdated', workspace.agent);

  // If window.refetchSettingsSidebarData exists, call it to refresh the UI
  if (window.refetchSettingsSidebarData) {
    window.refetchSettingsSidebarData();
  }
}
export function registerFileDrag(workspace) {
  const mouseCoords = { x: 0, y: 0 };
  const dragContainer = workspace.container;

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dragContainer.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight effect when dragging files over
  dragContainer.addEventListener('dragover', (event) => {
    // You can add some visual feedback here

    const rect = workspace.domElement.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.x) / workspace.scale);
    const y = Math.round((event.clientY - rect.y) / workspace.scale);

    //console.log('File is over the canvas', x, y);
    mouseCoords.x = x;
    mouseCoords.y = y;
  });

  // Handle dropped files
  dragContainer.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    if (workspace.locked) return;
    handleFiles(files);
  }

  function handleFiles(files) {
    const dropX = mouseCoords.x;
    const dropY = mouseCoords.y;
    [...files].forEach((file) => {
      if (
        file.type === 'application/json' ||
        file.type === 'text/plain' ||
        file.name.endsWith('.smyth')
      ) {
        // If the file is JSON or text, read the content
        const reader = new FileReader();
        reader.onload = async function (e: any) {
          //console.log(e.target.result); // Log file content
          try {
            const jsonData = JSON.parse(e.target.result);
            const format = identifyFormat(jsonData);

            switch (format) {
              case 'POSTMAN':
                importPostman(workspace, jsonData, dropX, dropY);
                break;
              case 'SMYTH_AGENT':
                importSmythFile(workspace, jsonData);
                break;
              case 'TEXT':
                console.log(jsonData);
                break;
              default:
                console.log('Unknown format');
            }
            //const result = parsePostman(jsonData);
            //console.log(JSON.stringify(result));
          } catch (e) {
            console.log(e);
          }
        };
        reader.readAsText(file);
      } else {
        // Otherwise, log just the filename
        //console.log(file.name);
      }
    });
  }
}

function identifyFormat(data) {
  if (typeof data === 'string') return 'TEXT';
  if (data?.info?._postman_id) return 'POSTMAN';
  if (data.version && Array.isArray(data.components) && Array.isArray(data.connections))
    return 'SMYTH_AGENT';
}

function parsePostman(data) {
  if (!data.item) return null;
  let left = 0;
  const parseItem = (item, parent) => {
    let result = []; //{"componentsProps":[],"connections":[]};
    let top = 0;
    for (let entry of item) {
      if (entry.request) {
        let body;
        let contentType = 'none';
        let url = entry.request?.url?.raw || '';

        // Check if the URL starts with a variable (e.g., {{baseUrl}})
        const startsWithVariable = /^{{.*?}}/.test(url);

        // Only add 'http://' if the URL doesn't start with a protocol and doesn't start with a variable
        if (
          !url.startsWith('http:') &&
          !url.startsWith('https:') &&
          url !== '' &&
          !startsWithVariable
        ) {
          url = `http://${url}`;
        }

        const method = entry.request?.method || 'GET';
        const mode = entry.request?.body?.mode;

        try {
          if (mode === 'raw') {
            contentType = `application/${entry.request?.body?.options?.raw?.language || 'json'}`;
            body = JSON.parse(entry.request.body.raw || '{}');
          } else if (mode === 'urlencoded' || mode === 'formdata') {
            contentType =
              mode === 'formdata' ? 'multipart/form-data' : 'application/x-www-form-urlencoded';
            body = {};
            for (let b of entry.request?.body?.[mode] || []) {
              body[b.key] = b.value;
            }
          }
        } catch (e) {
          console.error('Error parsing body:', e);
        }

        const headers = {};
        for (let hdr of entry.request?.header || []) {
          headers[hdr.key] = hdr.value;
        }

        const APICallComponent = {
          name: 'APICall',
          outputs: [
            {
              name: 'Response',
              color: '#3C89F9',
              index: 0,
              default: true,
            },
            {
              name: 'Headers',
              color: '#3C89F9',
              index: 1,
              default: true,
            },
          ],
          inputs: [],
          top: `${top}px`,
          left: `${left}px`,
          width: '',
          uid: uid(),
          defaultOutputs: ['Headers', 'Response'],
          defaultInputs: [],
          data: {
            method,
            contentType,
            url,
            headers: JSON.stringify(headers),
            body: JSON.stringify(body),
          },
          title: entry.name,
          description: parent.name,
        };

        result.push(APICallComponent);
      } else if (entry.item) {
        result = [...result, ...parseItem(entry.item, entry).flat(Infinity)];
      }

      top += 250;
    }

    left += 300;
    return result;
  };

  const components = parseItem(data.item, data);
  return { components, connections: [] };
}
