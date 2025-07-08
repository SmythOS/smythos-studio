import { delay } from '../../../utils';
declare const workspace: any;
function extractWorkflows(data) {
  const { components, connections } = data;

  // Build adjacency list for graph representation
  function buildGraph() {
    const graph = new Map();
    components.forEach((component) => {
      graph.set(component.id, []);
    });

    connections.forEach(({ sourceId, targetId }) => {
      if (graph.has(sourceId)) {
        graph.get(sourceId).push(targetId);
      }
    });

    return graph;
  }

  // Perform Topological Sort and Calculate Levels
  function calculateLevels(startId, graph) {
    const levels = {};
    const visited = new Set();

    // Initialize levels with 0
    components.forEach((component) => {
      levels[component.id] = component.name === 'APIEndpoint' ? 0 : 1;
    });

    // Recursive DFS to calculate levels
    function dfs(nodeId, currentLevel) {
      //if (visited.has(nodeId)) return;

      visited.add(nodeId);
      levels[nodeId] = Math.max(levels[nodeId], currentLevel);

      const neighbors = graph.get(nodeId) || [];
      neighbors.forEach((neighbor) => {
        dfs(neighbor, levels[nodeId] + 1);
      });
    }

    // Start DFS from the starting component
    dfs(startId, 0);

    return levels;
  }

  // Helper function to get all connected components and their connections
  function getConnectedComponentsAndConnections(componentId) {
    const graph = buildGraph();
    const levels = calculateLevels(componentId, graph);

    let visited = new Set();
    let toVisit = [componentId];
    let workflowComponents = [];
    let workflowConnections = [];

    while (toVisit.length > 0) {
      const currentId = toVisit.pop();

      if (!visited.has(currentId)) {
        visited.add(currentId);

        // Find the component by id
        const component = components.find((c) => c.id === currentId);
        if (component) {
          //component.dom = document.getElementById(component.id);
          workflowComponents.push({ ...component, _level: levels[currentId] });

          // Find all connections where this component is the source
          const connectedConns = connections.filter((conn) => conn.sourceId === currentId) || [];
          connectedConns.forEach((conn) => {
            workflowConnections.push(conn);
            toVisit.push(conn.targetId);
          });
        }
      }
    }

    components.sort((a, b) => a._level - b._level);
    return {
      components: workflowComponents,
      connections: workflowConnections,
    };
  }

  function isSourceComponent(component) {
    //a source component is a component that has no incoming connections
    return connections.filter((conn) => conn.targetId === component.id).length === 0;
  }
  // Extract workflows starting with APIEndpoint components
  const workflows = [];

  if (!components) return workflows;
  for (let component of components) {
    if (isSourceComponent(component)) {
      const workflow = getConnectedComponentsAndConnections(component.id);
      workflows.push(workflow);
    }
  }

  return workflows;
}
function detectComponentIssues(json) {
  const errors = [];
  const warnings = [];

  // Extract components and connections from JSON
  const components = json.components;
  const connections = json.connections;

  // Process each component
  for (const component of components) {
    const componentId = component.id;
    const componentName = component.name;
    const displayName = component.displayName || componentName;

    // Track connected inputs and outputs by their indices
    const connectedInputs = new Set();
    const connectedOutputs = new Set();

    // Find all connections for this component
    for (const connection of connections) {
      // Check if this component has inputs connected to it
      if (connection.targetId === componentId) {
        connectedInputs.add(connection.targetIndex);
      }

      // Check if this component has outputs connected from it
      if (connection.sourceId === componentId) {
        connectedOutputs.add(connection.sourceIndex);
      }
    }

    // ERROR: MISSING_INPUT_CON - component with no input connected
    // Skip this check for APIEndpoint components
    if (
      componentName !== 'APIEndpoint' &&
      component.inputs &&
      component.inputs.length > 0 &&
      connectedInputs.size === 0
    ) {
      errors.push({
        type: 'MISSING_INPUT_CON',
        component: componentName,
        displayName,
        id: componentId,
        inputs: component.inputs.map(
          (input) => input.name + `${input.optional ? ' (this input is marked as optional)' : ''}`,
        ),
      });
    }

    // ERROR: MISSING_OUTPUT_CON - component with no output connected
    // Skip this check for APIOutput components
    if (
      componentName !== 'APIOutput' &&
      component.outputs &&
      component.outputs.length > 0 &&
      connectedOutputs.size === 0
    ) {
      errors.push({
        type: 'MISSING_OUTPUT_CON',
        component: componentName,
        displayName,
        id: componentId,
        outputs: component.outputs.map((output) => output.name),
      });
    }

    // WARNING: UNUSED_CUSTOM_INPUT - custom inputs that are not connected
    // Skip this check for APIEndpoint components
    if (componentName !== 'APIEndpoint' && component.inputs) {
      const unusedCustomInputs = component.inputs
        .filter((input) => input.default === false && !connectedInputs.has(input.index))
        .map((input) => input.name);

      if (unusedCustomInputs.length > 0) {
        warnings.push({
          type: 'UNUSED_CUSTOM_INPUT',
          component: componentName,
          displayName,
          id: componentId,
          inputs: unusedCustomInputs,
        });
      }
    }

    // WARNING: UNUSED_CUSTOM_OUTPUT - custom outputs that are not connected
    // Skip this check for APIOutput components
    if (componentName !== 'APIOutput' && component.outputs) {
      const unusedCustomOutputs = component.outputs
        .filter((output) => output.default === false && !connectedOutputs.has(output.index))
        .map((output) => output.name);

      if (unusedCustomOutputs.length > 0) {
        warnings.push({
          type: 'UNUSED_CUSTOM_OUTPUT',
          component: componentName,
          displayName,
          id: componentId,
          outputs: unusedCustomOutputs,
        });
      }
    }
  }

  return { errors, warnings };
}

// Function to detect workflow-level issues
function detectWorkflowIssues(workflows) {
  const workflowWarnings = [];

  // Check for missing endpoints
  for (let i = 0; i < workflows.length; i++) {
    const workflow = workflows[i];
    const hasEndpoint = workflow.components.some((component) => component.name === 'APIEndpoint');

    if (!hasEndpoint) {
      workflowWarnings.push({
        type: 'WF_MISSING_ENDPOINT',
        workflowIndex: i,
        components: workflow.components.map((c) => ({
          id: c.id,
          displayName: c.displayName || c.name,
        })),
      });
    }
  }

  // Check for component conflicts between workflows
  const componentToWorkflows = new Map(); // Maps component ID to array of workflow indices

  // Build the component to workflows map
  for (let i = 0; i < workflows.length; i++) {
    const workflow = workflows[i];

    for (const component of workflow.components) {
      if (!componentToWorkflows.has(component.id)) {
        componentToWorkflows.set(component.id, []);
      }
      componentToWorkflows.get(component.id).push(i);
    }
  }

  // Identify conflicts
  const conflicts = new Map(); // Maps pairs of conflicting workflow indices to arrays of conflicting component IDs

  for (const [componentId, workflowIndices] of componentToWorkflows.entries()) {
    if (workflowIndices.length > 1) {
      // We have a conflict
      for (let i = 0; i < workflowIndices.length; i++) {
        for (let j = i + 1; j < workflowIndices.length; j++) {
          const wf1 = workflowIndices[i];
          const wf2 = workflowIndices[j];
          const conflictKey = `${wf1}-${wf2}`;

          if (!conflicts.has(conflictKey)) {
            conflicts.set(conflictKey, {
              workflow1: wf1,
              workflow2: wf2,
              components: [],
            });
          }

          conflicts.get(conflictKey).components.push(componentId);
        }
      }
    }
  }

  // Format conflict warnings
  for (const conflict of conflicts.values()) {
    const workflow1 = workflows[conflict.workflow1];
    const workflow2 = workflows[conflict.workflow2];

    // Find APIEndpoints in each workflow
    const endpoints1 = workflow1.components
      .filter((c) => c.name === 'APIEndpoint')
      .map((c) => ({
        id: c.id,
        displayName: c.displayName || c.name,
        title: c.title || '',
      }));

    const endpoints2 = workflow2.components
      .filter((c) => c.name === 'APIEndpoint')
      .map((c) => ({
        id: c.id,
        displayName: c.displayName || c.name,
        title: c.title || '',
      }));

    // Get component details for the conflicting components
    const conflictingComponents = conflict.components.map((id) => {
      const component = [...workflow1.components, ...workflow2.components].find((c) => c.id === id);

      return {
        id: component.id,
        displayName: component.displayName || component.name,
        title: component.title || '',
      };
    });

    workflowWarnings.push({
      type: 'WF_CONFLICT',
      workflow1Index: conflict.workflow1,
      workflow2Index: conflict.workflow2,
      endpoints1,
      endpoints2,
      conflictingComponents,
    });
  }

  return workflowWarnings;
}

// Format and display component issue results
function formatComponentResults(results) {
  let output = '';

  if (results.errors.length > 0) {
    output += 'Component Errors:\n';
    for (const error of results.errors) {
      if (error.type === 'MISSING_INPUT_CON') {
        output += `${error.type}: Component "${error.displayName}" (${
          error.id
        }) has no connected inputs: ${error.inputs.join(', ')}\n`;
      } else if (error.type === 'MISSING_OUTPUT_CON') {
        output += `${error.type}: Component "${error.displayName}" (${
          error.id
        }) has no connected outputs: ${error.outputs.join(', ')}\n`;
      }
    }
  }

  if (results.warnings.length > 0) {
    output += '\nComponent Warnings:\n';
    for (const warning of results.warnings) {
      if (warning.type === 'UNUSED_CUSTOM_INPUT') {
        output += `${warning.type}: Component "${warning.displayName}" (${
          warning.id
        }) has unused custom inputs: ${warning.inputs.join(', ')}\n`;
      } else if (warning.type === 'UNUSED_CUSTOM_OUTPUT') {
        output += `${warning.type}: Component "${warning.displayName}" (${
          warning.id
        }) has unused custom outputs: ${warning.outputs.join(', ')}\n`;
      }
    }
  }

  return output || '';
}

// Format and display workflow issue results
function formatWorkflowResults(workflowWarnings) {
  if (workflowWarnings.length === 0) {
    return '';
  }

  let output = 'Workflow Errors:\n';

  for (const warning of workflowWarnings) {
    if (warning.type === 'WF_MISSING_ENDPOINT') {
      output += `${warning.type}: Workflow ${
        warning.workflowIndex + 1
      } has no APIEndpoint component. Components: ${warning.components
        .map((c) => `"${c.displayName}" (${c.id})`)
        .join(', ')}\n`;
    } else if (warning.type === 'WF_CONFLICT') {
      output += `${warning.type}: Workflows ${warning.workflow1Index + 1} and ${
        warning.workflow2Index + 1
      } share components.\n`;

      output += `  Workflow ${warning.workflow1Index + 1} endpoint(s): ${
        warning.endpoints1.map((e) => `"${e.displayName}" (${e.id}) "${e.title}"`).join(', ') ||
        'None'
      }\n`;
      output += `  Workflow ${warning.workflow2Index + 1} endpoint(s): ${
        warning.endpoints2.map((e) => `"${e.displayName}" (${e.id}) "${e.title}"`).join(', ') ||
        'None'
      }\n`;
      output += `  Shared components: ${warning.conflictingComponents
        .map((c) => `"${c.displayName}" (${c.id}) "${c.title}"`)
        .join(', ')}\n`;
    }
  }

  return output;
}

// Combined validation function
function validateFlow(jsonData) {
  // First check component-level issues
  const componentIssues = detectComponentIssues(jsonData);

  // Then extract workflows and check workflow-level issues
  const workflows = extractWorkflows(jsonData);
  const workflowIssues = detectWorkflowIssues(workflows);

  // Format and combine results
  const componentResults = formatComponentResults(componentIssues);
  const workflowResults = formatWorkflowResults(workflowIssues);

  // Calculate total number of issues
  const totalIssues =
    componentIssues.errors.length + componentIssues.warnings.length + workflowIssues.length;
  const totalMessage = `\n\nTotal issues found: ${totalIssues}\n\n`;

  if (totalIssues == 0) return '';

  return totalMessage + componentResults + '\n\n' + workflowResults;
}

export async function lint() {
  console.log('Weaver Linting ...');

  const weaverTextArea: HTMLTextAreaElement = document.getElementById(
    'agentMessageInput',
  ) as HTMLTextAreaElement;
  const weaverSendButton = document.getElementById('agentSendButton') as HTMLButtonElement;

  const agentData = await workspace.export();
  const lintResults = validateFlow(agentData).trim();
  if (lintResults) {
    console.log('Weaver Linting detected issues ...', lintResults);

    weaverTextArea.value = `Lint:Weaver\nHold on, I need to fix some issues \n\n${lintResults}`;
    await delay(50);

    if (window['DEBUG_WEAVER']) {
      console.warn('Linter message need to be sent manually when DEBUG_WEAVER is set');
    } else {
      weaverSendButton.click();
    }
    // await delay(50);
    // const lastUserMessage = document.querySelector(
    //   '#agentChatHistory .user-messages-container:last-child',
    // ) as HTMLElement;

    // if (lastUserMessage && lastUserMessage.innerText.includes(`Lint:Weaver`)) {
    //   lastUserMessage.classList.add('user-message-weaver-lint');
    // }
  } else {
    console.log('Weaver Linting Done : no error detected');
  }

  return lintResults;
}
