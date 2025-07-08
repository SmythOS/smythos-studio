export function registerMiniMap(workspace) {
  const MAX_SCALE_FACTOR = 0.08;
  const canvas = document.querySelector('#minimap') as HTMLCanvasElement;
  if (!canvas) return;
  //canvas.width = 280;
  //canvas.height = 150;
  //document.body.appendChild(canvas);
  // canvas.setAttribute('style', 'background: #dddddd75;border: 8px solid #dddddd10;');

  //document.getElementById('mini-map-canvas'); // Your canvas element
  const ctx = canvas.getContext('2d');
  const workspaceContainer = workspace.container;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  window.requestAnimationFrame(updateMiniMap);

  function updateMiniMap() {
    // Reset the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.globalCompositeOperation = 'source-over';
    // Get workspace bounds
    const bounds = calculateWorkspaceBounds();

    // Calculate scale factor
    const scaleFactor = calculateScaleFactor(bounds);

    // Layer 1: Draw each component on the mini-map
    document.querySelectorAll('.component, .agent-card').forEach((component) => {
      const componentBounds = component.getBoundingClientRect();
      const scaledWidth = componentBounds.width * scaleFactor;
      const scaledHeight = componentBounds.height * scaleFactor;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(
        (componentBounds.left - bounds.left) * scaleFactor,
        (componentBounds.top - bounds.top) * scaleFactor,
        scaledWidth,
        scaledHeight,
        2,
      );
      ctx.fill();
    });

    // // Create a temporary canvas for the semi-transparent layer and viewport 'hole'
    // const tempCanvas = document.createElement('canvas');
    // tempCanvas.width = canvas.width;
    // tempCanvas.height = canvas.height;
    // const tempCtx = tempCanvas.getContext('2d');

    // Layer 2: Draw semi-opaque overlay on the temporary canvas
    tempCtx.fillStyle = 'rgba(204, 204, 204, 0.8)';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Layer 3: 'Cut out' the viewport area from the semi-transparent layer on the temporary canvas
    const viewportBounds = workspaceContainer.getBoundingClientRect();
    tempCtx.globalCompositeOperation = 'destination-out';
    tempCtx.fillRect(
      (viewportBounds.left - bounds.left) * scaleFactor,
      (viewportBounds.top - bounds.top) * scaleFactor,
      workspaceContainer.offsetWidth * scaleFactor,
      workspaceContainer.offsetHeight * scaleFactor,
    );

    ctx.globalAlpha = 0.5;
    // Draw the temporary canvas onto the main canvas
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalAlpha = 1.0;

    // Optionally draw a border around the viewport
    ctx.strokeStyle = '#ccc'; // Color for the viewport rectangle border
    ctx.lineWidth = 2;
    ctx.strokeRect(
      (viewportBounds.left - bounds.left) * scaleFactor,
      (viewportBounds.top - bounds.top) * scaleFactor,
      workspaceContainer.offsetWidth * scaleFactor,
      workspaceContainer.offsetHeight * scaleFactor,
    );

    window.requestAnimationFrame(updateMiniMap);
  }

  function calculateWorkspaceBounds() {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    // Consider components for bounds
    document.querySelectorAll('.component, .agent-card').forEach((component) => {
      const rect = component.getBoundingClientRect();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });

    // Consider the viewport for bounds
    const viewportRect = workspaceContainer.getBoundingClientRect();
    minX = Math.min(minX, viewportRect.left);
    minY = Math.min(minY, viewportRect.top);
    maxX = Math.max(maxX, viewportRect.right);
    maxY = Math.max(maxY, viewportRect.bottom);

    // If no components and viewport is at default, set to some default workspace area
    if (minX === Number.POSITIVE_INFINITY) {
      minX = 0;
      minY = 0;
      maxX = 100; // some default width
      maxY = 100; // some default height
    }

    return { left: minX, top: minY, right: maxX, bottom: maxY };
  }
  function calculateScaleFactor(bounds) {
    // Determine the size of the workspace
    const workspaceWidth = bounds.right - bounds.left;
    const workspaceHeight = bounds.bottom - bounds.top;

    // Determine the size of the mini-map
    const miniMapWidth = canvas.width;
    const miniMapHeight = canvas.height;

    // Calculate scale factors for both width and height
    const scaleX = miniMapWidth / workspaceWidth;
    const scaleY = miniMapHeight / workspaceHeight;

    // Use the smaller of the two scale factors to ensure everything fits
    let scaleFactor = Math.min(scaleX, scaleY);

    // If the calculated scale factor is greater than the maximum, use the maximum
    scaleFactor = Math.min(scaleFactor, MAX_SCALE_FACTOR);

    return scaleFactor;
  }

  // function calculateScaleFactor(bounds) {
  //     // Determine the size of the workspace
  //     const workspaceWidth = bounds.right - bounds.left;
  //     const workspaceHeight = bounds.bottom - bounds.top;

  //     // Determine the size of the mini-map
  //     const miniMapWidth = canvas.width;
  //     const miniMapHeight = canvas.height;

  //     // Calculate scale factors for both width and height
  //     const scaleX = miniMapWidth / workspaceWidth;
  //     const scaleY = miniMapHeight / workspaceHeight;

  //     // Use the smaller of the two scale factors to ensure everything fits
  //     return Math.min(scaleX, scaleY);
  // }

  function canvasClick(event) {
    const panzoom = workspace.panzoom;

    const canvasRect = canvas.getBoundingClientRect();
    const viewportBounds = workspaceContainer.getBoundingClientRect();
    // Calculate the x, y position of the click relative to the mini-map canvas
    const clickX = event.clientX - canvasRect.left;
    const clickY = event.clientY - canvasRect.top;

    // Get workspace bounds and scale factor
    const bounds = calculateWorkspaceBounds();
    const scaleFactor = calculateScaleFactor(bounds);

    //const viewPortRect = elementRect(workspaceContainer);

    const componentViewPortBounds = workspaceContainer.getBoundingClientRect();
    const vpLeft = (componentViewPortBounds.left - bounds.left) * scaleFactor;
    const vpTop = (componentViewPortBounds.top - bounds.top) * scaleFactor;

    const curPan = panzoom.getPan();

    panzoom.pan(
      curPan.x + viewportBounds.width / 2 + (vpLeft - clickX) / scaleFactor,
      curPan.y + viewportBounds.height / 2 + (vpTop - clickY) / scaleFactor,
    );
  }

  // Event listener for click events on the mini-map canvas
  //canvas.addEventListener('click', canvasClick);

  let mouseDown = false;
  let mouseDownX = 0;
  let mouseDownY = 0;
  canvas.addEventListener('mousedown', (event) => {
    mouseDown = true;
    mouseDownX = event.clientX;
    mouseDownY = event.clientY;
    canvasClick(event);
  });
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
  });

  // Event listener for mousemove events on the mini-map canvas
  canvas.addEventListener('mousemove', (event) => {
    const panzoom = workspace.panzoom;
    const curPan = panzoom.getPan();
    if (mouseDown) {
      const bounds = calculateWorkspaceBounds();
      const scaleFactor = calculateScaleFactor(bounds);

      const deltaX = event.clientX - mouseDownX;
      const deltaY = event.clientY - mouseDownY;
      mouseDownX = event.clientX;
      mouseDownY = event.clientY;

      panzoom.pan(curPan.x - deltaX / scaleFactor, curPan.y - deltaY / scaleFactor, {
        animate: false,
      });
    }
  });
}
