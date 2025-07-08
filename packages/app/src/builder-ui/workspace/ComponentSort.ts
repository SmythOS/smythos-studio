import { delay } from '../utils';

declare var workspace: any;
let isSorting = false;

function calculateBoundingBox(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error('Input must be a non-empty array of DOM components.');
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  components.forEach((component) => {
    const style = component.style;
    const left = parseFloat(style.left) || 0;
    const top = parseFloat(style.top) || 0;
    const width = parseFloat(component.clientWidth) || 0;
    const height = parseFloat(component.clientHeight) || 0;

    const right = left + width;
    const bottom = top + height;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function updateWFBoundingBox(workflows) {
  workflows.forEach((wf) => {
    const wfComponents = wf.components.map((c) => document.getElementById(c.id));

    const newBox = calculateBoundingBox(wfComponents);
    if (!wf.box) {
      wf.box = newBox;
    } else {
      wf.box.x = newBox.x;
      wf.box.y = newBox.y;
      wf.box.width = newBox.width;
      wf.box.height = newBox.height;
    }
  });
}

async function extractWorkflows(data) {
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

  updateWFBoundingBox(workflows);

  return workflows;
}

async function moveFlow(wf, x, y) {
  for (let c of wf.components) {
    const dom = document.getElementById(c.id);
    if (!dom) continue;

    dom.style.transition = '0.2s ease-in-out';
    const left = parseInt(dom.style.left) + x;
    const top = parseInt(dom.style.top) + y;
    dom.style.left = `${left}px`;
    dom.style.top = `${top}px`;
  }

  await delay(300);
  for (let c of wf.components) {
    const dom = document.getElementById(c.id);
    if (!dom) continue;

    dom.style.transition = '';

    workspace.jsPlumbInstance.repaint(dom);
  }
}

//aligns workflows globally
async function alignBoxes(objects) {
  if (!objects || objects.length === 0) {
    return [];
  }

  // Find the leftmost x-coordinate
  const minX = Math.min(...objects.map((obj) => obj.box.x));

  // Sort objects by their original y-coordinates
  objects.sort((a, b) => a.box.y - b.box.y);

  let currentY = 0; // Start positioning from 0

  for (let obj of objects) {
    await moveFlow(obj, minX - obj.box.x, currentY - obj.box.y);
    await updateWFBoundingBox([obj]);
    // Update currentY to the next position
    currentY += obj.box.height + 100;
  }

  await delay(200);
  workspace.jsPlumbInstance.repaintEverything();
}

//align components within workflow
async function organizeComponents(components, initialX, initialY) {
  // Group components by their level
  const levels = {};

  components.forEach((component) => {
    const level = component._level;
    if (!levels[level]) {
      levels[level] = [];
    }
    levels[level].push(component);
  });

  // Calculate positions
  const levelPositions = {};
  let xPos = initialX;

  const _levels = Object.keys(levels).sort((a, b) => parseInt(a) - parseInt(b));
  for (let level of _levels) {
    //0.2s ease-in-out
    const levelComponents = levels[level];

    // Determine max width of components in this level
    const maxWidth = Math.max(
      ...levelComponents.map((component) => {
        const dom = document.getElementById(component.id);
        if (!dom) return 0;
        return dom.offsetWidth || 0;
      }),
    );

    // Set the starting x position for this level
    levelPositions[level] = xPos;

    // Position components vertically with a gap of 100px
    let yPos = initialY;
    for (let component of levelComponents) {
      const dom = document.getElementById(component.id);
      if (!dom) continue;

      dom.style.transition = '0.1s ease-in-out';
      dom.style.left = `${xPos}px`;
      dom.style.top = `${yPos}px`;

      yPos += (dom.offsetHeight || 0) + 100; // Adjust based on height and gap
      dom.style.transition = '';

      await delay(100);
      dom.style.transition = '0.1s ease-in-out';
      workspace.jsPlumbInstance.repaint(dom);
    }

    // Move xPos to the next level (200px + max width of current level)
    xPos += maxWidth + 200;
  }

  return components; // Return the updated array
}

export async function sortAgent() {
  if (document.querySelector('.component.selected')) {
    await sortSelection();
  } else {
    await sortAll();
  }
}

async function sortAll() {
  if (isSorting) {
    return;
  }

  try {
    isSorting = true;
    const agentData = (await workspace.export(false)) || workspace.agent.data;
    const workflows = await extractWorkflows(agentData);
    await delay(50);

    await workspace.export();
    await delay(200);
    workspace.lock();

    // Process workflows in smaller batches if there are many components
    const BATCH_SIZE = 10;
    for (let i = 0; i < workflows.length; i += BATCH_SIZE) {
      const batch = workflows.slice(i, i + BATCH_SIZE);
      for (let wf of batch) {
        await organizeComponents(wf.components, wf.box.x, wf.box.y);
      }
      await delay(100); // Allow time for DOM updates
    }

    await delay(100);
    updateWFBoundingBox(workflows);
    await delay(100);
    await alignBoxes(workflows);
    await delay(200); // Increased delay to ensure DOM updates are complete
    workspace.jsPlumbInstance.repaintEverything();
  } catch (error) {
    console.error('Error during sort:', error);
  } finally {
    workspace.unlock();

    // Ensure all component positions are properly saved
    try {
      await delay(1000); // Give more time for final DOM updates
      await workspace.export(); // Update the agent data with current positions
      await workspace.saveAgent();
      await delay(100);
      isSorting = false;
    } catch (saveError) {
      console.error('Error saving agent:', saveError);
      isSorting = false;
    }
  }
}

async function sortSelection() {
  if (isSorting) {
    return;
  }

  try {
    isSorting = true;
    const agentData = (await workspace.export(false)) || workspace.agent.data;
    const workflows = await extractWorkflows(agentData);
    const selectedComponents = [...document.querySelectorAll('.component.selected')];

    // Only proceed if there are selected components
    if (!selectedComponents.length) {
      return;
    }

    //find workflows containing selected components
    const selectedWorkflows = workflows.filter((wf) =>
      selectedComponents.some((c) => wf.components.some((wc) => wc.id === c.id)),
    );

    workspace.lock();
    //sort selected workflows
    for (let wf of selectedWorkflows) {
      await organizeComponents(wf.components, wf.box.x, wf.box.y);
    }

    const unsortedComponents = [];
    for (let wf of workflows) {
      if (!selectedWorkflows.includes(wf)) {
        unsortedComponents.push(...wf.components);
      }
    }

    // Only calculate unsorted box if there are unsorted components
    if (unsortedComponents.length > 0) {
      await delay(100);
      updateWFBoundingBox(selectedWorkflows);
      const unsortedBox = calculateBoundingBox(
        unsortedComponents.map((c) => document.getElementById(c.id)),
      );
      selectedWorkflows.unshift({
        box: unsortedBox,
        components: unsortedComponents,
        connections: [],
      });
    }

    await delay(100);
    alignBoxes(selectedWorkflows);
    await delay(100);
    workspace.jsPlumbInstance.repaintEverything();
  } catch (error) {
    console.error('Error during sort:', error);
  } finally {
    workspace.unlock();
    await delay(500);
    // Ensure all component positions are properly saved
    try {
      await workspace.saveAgent();
      await delay(100);
      isSorting = false;
    } catch (saveError) {
      console.error('Error saving agent:', saveError);
      isSorting = false;
    }
  }
}
