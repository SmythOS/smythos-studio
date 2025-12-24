import { delay } from '../utils';

declare var workspace: any;
let isSorting = false;

/** Bounding box type for elements */
interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Relative position offset */
interface RelativePosition {
  dx: number;
  dy: number;
}

/** Note component with its contained components */
interface NoteGroup {
  noteId: string;
  noteElement: HTMLElement;
  containedComponentIds: string[];
  associatedWorkflowIndex: number | null;
}

/** Context object for Note-aware sorting operations */
interface NoteSortContext {
  noteGroups: NoteGroup[];
  relativePositions: Map<string, Map<string, RelativePosition>>;
  containedComponentIds: Set<string>;
}

/**
 * Gets the style-based bounding box of an element
 */
function getElementBounds(element: HTMLElement): Bounds {
  return {
    left: parseFloat(element.style.left) || 0,
    top: parseFloat(element.style.top) || 0,
    width: element.offsetWidth || 0,
    height: element.offsetHeight || 0,
  };
}

/**
 * Checks if two rectangles overlap
 */
function rectanglesOverlap(rect1: Bounds, rect2: Bounds): boolean {
  return !(
    rect1.left + rect1.width <= rect2.left ||
    rect2.left + rect2.width <= rect1.left ||
    rect1.top + rect1.height <= rect2.top ||
    rect2.top + rect2.height <= rect1.top
  );
}

/**
 * Detects all Note components and collects context needed for Note-aware sorting.
 * @returns NoteSortContext with note groups, relative positions, and contained component IDs
 */
function initializeNoteSortContext(): NoteSortContext {
  const noteGroups: NoteGroup[] = [];
  const relativePositions = new Map<string, Map<string, RelativePosition>>();
  const containedComponentIds = new Set<string>();

  const noteElements = Array.from(
    document.querySelectorAll('.component.Note'),
  ) as HTMLElement[];
  const allComponents = Array.from(
    document.querySelectorAll('.component:not(.Note)'),
  ) as HTMLElement[];

  for (const noteElement of noteElements) {
    const noteRect = noteElement.getBoundingClientRect();
    const noteLeft = parseFloat(noteElement.style.left) || 0;
    const noteTop = parseFloat(noteElement.style.top) || 0;
    const contained: string[] = [];
    const positions = new Map<string, RelativePosition>();

    for (const compEl of allComponents) {
      if (!compEl.id) continue;

      const compRect = compEl.getBoundingClientRect();
      const isInside =
        compRect.left >= noteRect.left &&
        compRect.right <= noteRect.right &&
        compRect.top >= noteRect.top &&
        compRect.bottom <= noteRect.bottom;

      if (isInside) {
        contained.push(compEl.id);
        containedComponentIds.add(compEl.id);
        positions.set(compEl.id, {
          dx: (parseFloat(compEl.style.left) || 0) - noteLeft,
          dy: (parseFloat(compEl.style.top) || 0) - noteTop,
        });
      }
    }

    noteGroups.push({
      noteId: noteElement.id,
      noteElement,
      containedComponentIds: contained,
      associatedWorkflowIndex: null,
    });
    relativePositions.set(noteElement.id, positions);
  }

  return { noteGroups, relativePositions, containedComponentIds };
}

/**
 * Associates each Note with a workflow based on its contained components
 */
function associateNotesWithWorkflows(
  noteGroups: NoteGroup[],
  workflows: Array<{ components: Array<{ id: string }> }>,
): void {
  for (const noteGroup of noteGroups) {
    for (let i = 0; i < workflows.length; i++) {
      const workflowIds = workflows[i].components.map((c) => c.id);
      if (noteGroup.containedComponentIds.some((id) => workflowIds.includes(id))) {
        noteGroup.associatedWorkflowIndex = i;
        break;
      }
    }
  }
}

/**
 * Repositions Notes to follow their contained components after sorting
 */
async function repositionNotesAfterSort(
  noteGroups: NoteGroup[],
  relativePositions: Map<string, Map<string, RelativePosition>>,
): Promise<void> {
  for (const noteGroup of noteGroups) {
    if (noteGroup.associatedWorkflowIndex === null || noteGroup.containedComponentIds.length === 0) {
      continue;
    }

    const containedElements = noteGroup.containedComponentIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (containedElements.length === 0) continue;

    const containedBox = calculateBoundingBox(containedElements);
    const positions = relativePositions.get(noteGroup.noteId);
    if (!positions) continue;

    // Find minimum relative offset to position Note correctly
    let minDx = Infinity;
    let minDy = Infinity;
    for (const relPos of positions.values()) {
      minDx = Math.min(minDx, relPos.dx);
      minDy = Math.min(minDy, relPos.dy);
    }

    noteGroup.noteElement.style.transition = '0.2s ease-in-out';
    noteGroup.noteElement.style.left = `${~~(containedBox.x - minDx)}px`;
    noteGroup.noteElement.style.top = `${~~(containedBox.y - minDy)}px`;
  }

  await delay(300);

  for (const noteGroup of noteGroups) {
    noteGroup.noteElement.style.transition = '';
  }
}

/**
 * Resolves collisions by shifting components that overlap with Notes but weren't originally inside
 */
async function resolveNoteCollisions(
  noteGroups: NoteGroup[],
  padding: number = 100,
): Promise<void> {
  const allComponents = Array.from(
    document.querySelectorAll('.component:not(.Note)'),
  ) as HTMLElement[];

  const originallyContainedIds = new Set<string>();
  for (const noteGroup of noteGroups) {
    for (const compId of noteGroup.containedComponentIds) {
      originallyContainedIds.add(compId);
    }
  }

  for (const noteGroup of noteGroups) {
    const noteBounds = getElementBounds(noteGroup.noteElement);
    const noteRightEdge = noteBounds.left + noteBounds.width;
    let minOverlapX = Infinity;
    let hasOverlap = false;

    // Find minimum X of overlapping components
    for (const compEl of allComponents) {
      if (originallyContainedIds.has(compEl.id)) continue;

      const compBounds = getElementBounds(compEl);
      if (rectanglesOverlap(noteBounds, compBounds)) {
        hasOverlap = true;
        minOverlapX = Math.min(minOverlapX, compBounds.left);
      }
    }

    if (!hasOverlap) continue;

    const shiftAmount = noteRightEdge + padding - minOverlapX;
    if (shiftAmount <= 0) continue;

    // Shift all components at or beyond the overlap point
    for (const compEl of allComponents) {
      if (originallyContainedIds.has(compEl.id)) continue;

      const compLeft = parseFloat(compEl.style.left) || 0;
      if (compLeft >= minOverlapX) {
        compEl.style.transition = '0.2s ease-in-out';
        compEl.style.left = `${~~(compLeft + shiftAmount)}px`;
      }
    }
  }

  await delay(300);

  for (const compEl of allComponents) {
    compEl.style.transition = '';
    workspace.jsPlumbInstance.repaint(compEl);
  }
}

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

export async function extractWorkflows(data) {
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
    dom.style.left = `${~~left}px`;
    dom.style.top = `${~~top}px`;
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

  //do we have an agent card .
  const agentCard: HTMLElement = document.querySelector('.agent-card');
  const agentBoundingBox = {
    x: parseFloat(agentCard.style.left) || 0,
    y: parseFloat(agentCard.style.top) || 0,
    width: agentCard.clientWidth || 0,
    height: agentCard.clientHeight || 0,
  };

  // Find the leftmost x-coordinate
  const minX = agentBoundingBox
    ? agentBoundingBox.x + agentBoundingBox.width + 150
    : Math.min(...objects.map((obj) => obj.box.x));

  // Sort objects by their original y-coordinates
  objects.sort((a, b) => a.box.y - b.box.y);

  let currentY = agentBoundingBox ? agentBoundingBox.y - objects.length * 20 : 0; // Start positioning from 0

  for (let obj of objects) {
    await moveFlow(obj, minX - obj.box.x, currentY - obj.box.y);
    await updateWFBoundingBox([obj]);
    // Update currentY to the next position
    currentY += obj.box.height + 100;
  }

  await delay(200);
  workspace.jsPlumbInstance.repaint(agentCard);
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

  console.log('levels', levels);

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
      dom.style.left = `${~~xPos}px`;
      dom.style.top = `${~~yPos}px`;

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
  const selected = [...document.querySelectorAll('.component.selected')];
  if (selected.length > 1) {
    await sortSelection();
  } else {
    await sortAll();
  }
}

async function sortAll() {
  if (isSorting) return;

  try {
    isSorting = true;
    const agentData = (await workspace.export(false)) || workspace.agent.data;

    // Initialize Note context before sorting
    const noteContext = initializeNoteSortContext();
    const { noteGroups, relativePositions, containedComponentIds } = noteContext;

    // Extract workflows and associate Notes with them
    const workflows = await extractWorkflows(agentData);
    associateNotesWithWorkflows(noteGroups, workflows);

    await workspace.export();
    await delay(200);
    workspace.lock();

    // Filter out Note-contained components from workflow sorting
    const workflowsForSorting = workflows.map((wf) => ({
      ...wf,
      components: wf.components.filter((c) => !containedComponentIds.has(c.id)),
    }));

    // Process workflows in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < workflowsForSorting.length; i += BATCH_SIZE) {
      const batch = workflowsForSorting.slice(i, i + BATCH_SIZE);
      for (const wf of batch) {
        if (wf.components.length > 0) {
          await organizeComponents(wf.components, wf.box.x, wf.box.y);
        }
      }
      await delay(100);
    }

    await delay(100);
    updateWFBoundingBox(workflows);
    await delay(100);
    await alignBoxes(workflows);
    await delay(200);

    // Reposition Notes to follow their contained components
    await repositionNotesAfterSort(noteGroups, relativePositions);

    // Resolve collisions with components that weren't originally inside Notes
    await resolveNoteCollisions(noteGroups);
  } catch (error) {
    console.error('Error during sort:', error);
  } finally {
    workspace.unlock();

    try {
      await delay(1000);
      await workspace.export();
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
  if (isSorting) return;

  try {
    isSorting = true;
    const agentData = (await workspace.export(false)) || workspace.agent.data;

    // Initialize Note context before sorting
    const noteContext = initializeNoteSortContext();
    const { noteGroups, relativePositions, containedComponentIds } = noteContext;

    const workflows = await extractWorkflows(agentData);
    const selectedComponents = [...document.querySelectorAll('.component.selected')];

    if (!selectedComponents.length) return;

    // Associate Notes with workflows
    associateNotesWithWorkflows(noteGroups, workflows);

    // Find workflows containing selected components
    const selectedWorkflows = workflows.filter((wf) =>
      selectedComponents.some((c) => wf.components.some((wc) => wc.id === c.id)),
    );

    workspace.lock();

    // Filter out Note-contained components from workflow sorting
    const selectedWorkflowsForSorting = selectedWorkflows.map((wf) => ({
      ...wf,
      components: wf.components.filter((c) => !containedComponentIds.has(c.id)),
    }));

    // Sort selected workflows
    for (const wf of selectedWorkflowsForSorting) {
      if (wf.components.length > 0) {
        await organizeComponents(wf.components, wf.box.x, wf.box.y);
      }
    }

    // Collect unsorted components
    const unsortedComponents = workflows
      .filter((wf) => !selectedWorkflows.includes(wf))
      .flatMap((wf) => wf.components);

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
    await alignBoxes(selectedWorkflows);
    await delay(100);

    // Reposition Notes to follow their contained components
    await repositionNotesAfterSort(noteGroups, relativePositions);

    // Resolve collisions with components that weren't originally inside Notes
    await resolveNoteCollisions(noteGroups);
  } catch (error) {
    console.error('Error during sort:', error);
  } finally {
    workspace.unlock();
    await delay(500);

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
