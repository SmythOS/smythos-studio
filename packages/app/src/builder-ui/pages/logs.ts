import { twModalDialog } from '../ui/tw-dialogs';

declare var jsonTree;

export default async function scripts() {
  document.title = 'Logs | SmythOS';
  await fetchLogs(1);
  document.querySelector('.loading')?.classList?.add('hidden');
}

function promiseAllStepN(n, list) {
  let tail = list.splice(n);
  let head = list;
  let resolved = [];
  let processed = 0;

  // If there are no more promises to process, return the resolved promises
  if (tail.length == 0) return Promise.all(head.map((x) => x()));

  return new Promise((resolve) => {
    head.forEach((x) => {
      let res = x();
      resolved.push(res);
      res.then((y) => {
        runNext();
        return y;
      });
    });
    function runNext() {
      if (processed == tail.length) {
        resolve(Promise.all(resolved));
      } else {
        resolved.push(
          tail[processed]().then((x) => {
            runNext();
            return x;
          }),
        );
        processed++;
      }
    }
  });
}

const PromiseAllConcurrent = (n) => (list) => promiseAllStepN(n, list);

function showLogsList(logsData) {
  const logsListDiv = document.querySelector('.logList');
  const logListItems = logsListDiv.querySelector('.logListItems');
  document.querySelector('.breadcrumb-last-item')?.classList?.add('hidden');
  document.querySelector('.breadcrumb-parent-link').setAttribute('href', '');
  document.querySelector('.breadcrumb-parent-link').setAttribute('disabled', 'true');

  logListItems.innerHTML = '';

  logsListDiv.classList.remove('hidden');
  document.querySelector('.logDetails')?.remove();

  for (let log of logsData.logs) {
    const rowTemplate = logsListDiv.querySelector('.rowTpl').cloneNode(true) as HTMLElement;
    rowTemplate.classList.remove('.rowTpl', 'hidden');
    /*
                <tr
                    class="rowTpl hidden bg-white w-full flex rounded-xl py-2 shadow-lg mt-3 cursor-pointer hover:bg-grey/30">
                    <td class="endpoint px-3 col-2 text-black rounded-l">{{endpoint}}</td>
                    <td class="px-6 col-6">{{input}}</td>
                    <td class="px-6 col-2 text-black">{{createdAt}}</td>
                    <td class="px-3 col-1 text-center rounded-r">{{tags}}</td>
                </tr>
        */
    rowTemplate.querySelector('._endpoint').textContent = log.sourceId;
    rowTemplate.querySelector('._input').textContent = log.input?.preview;
    rowTemplate.querySelector('._createdAt').innerHTML = `<span> ${new Date(
      log.createdAt,
    ).toLocaleDateString()} </span> <br/> <span> ${new Date(
      log.createdAt,
    ).toLocaleTimeString()} </span>`;

    const tagsContainer = rowTemplate.querySelector('._tags');
    tagsContainer.innerHTML = '';
    renderLogTags(log.tags, tagsContainer);

    rowTemplate.addEventListener('click', async () => {
      document.location.href = document.location.href + '?sessionID=' + log.sessionID;
    });

    logListItems.appendChild(rowTemplate);
  }

  renderPagination(logsData.totalPages, logsData.currentPage);
}

function renderPagination(totalPages, currentPage) {
  const paginationDiv = document.querySelector('.pagination');
  paginationDiv.innerHTML = '';

  if (totalPages > 1) {
    const paginationList = document.createElement('ul');
    paginationList.className = 'flex justify-center rounded-md flex-wrap gap-y-2';

    // First and Previous buttons
    const addNavigationButton = (text, page, disabled = false) => {
      const navItem = document.createElement('li');
      const navLink = document.createElement('a');
      navLink.textContent = text;
      navLink.href = `?page=${page}`;
      navLink.className = `flex items-center justify-center px-4 h-10 leading-tight border border-solid border-gray-300 bg-white text-gray-500 hover:bg-primary-100 hover:text-white hover:border-gray-300 ${
        disabled ? 'cursor-not-allowed opacity-50 pointer-events-none' : ''
      } ${text === 'Previous' || text === 'Next' ? 'border-l-0 border-r-0' : ''}`;
      navLink.addEventListener('click', (event) => {
        event.preventDefault();
        fetchLogs(page);
      });
      navItem.appendChild(navLink);
      paginationList.appendChild(navItem);
    };

    addNavigationButton('First', 1, currentPage === 1);
    addNavigationButton('Previous', currentPage > 1 ? currentPage - 1 : 1, currentPage === 1);

    const createPageItem = (i) => {
      const pageItem = document.createElement('li');
      pageItem.className = `${currentPage == i ? 'active' : ''}`;

      const pageLink = document.createElement('a');
      pageLink.className = `flex items-center justify-center px-4 h-10 leading-tight border border-solid border-gray-300 ${
        currentPage == i
          ? 'bg-primary-100 text-white'
          : 'bg-white text-gray-500 border-gray-300 hover:bg-primary-100 hover:text-white hover:border-gray-300'
      }`;
      if (i != totalPages) {
        pageLink.classList.add('border-e-0');
      }
      if (i == 1) {
        pageLink.classList.add('rounded-l-md');
      }
      if (i == totalPages) {
        pageLink.classList.add('rounded-r-md');
      }
      pageLink.href = `?page=${i}`;
      pageLink.textContent = i.toString();

      pageLink.addEventListener('click', (event) => {
        event.preventDefault();
        fetchLogs(i);
      });

      pageItem.appendChild(pageLink);
      return pageItem;
    };

    if (totalPages <= 7) {
      // Show all pages if total pages are less than or equal to 7
      for (let i = 1; i <= totalPages; i++) {
        paginationList.appendChild(createPageItem(i));
      }
    } else {
      // Show ellipsis for large number of pages
      const addEllipsis = () => {
        const ellipsis = document.createElement('li');
        ellipsis.textContent = '...';
        ellipsis.className =
          'px-4 h-10 flex items-center justify-center border border-solid border-gray-300 border-l-0 border-r-0 bg-white text-gray-500';
        paginationList.appendChild(ellipsis);
      };

      for (let i = 1; i <= totalPages; i++) {
        if (
          i == 1 || // First page
          i == totalPages || // Last page
          (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
          paginationList.appendChild(createPageItem(i));
        } else if (i == currentPage - 3 || i == currentPage + 3) {
          addEllipsis();
        }
      }
    }

    // Next and Last buttons
    addNavigationButton(
      'Next',
      currentPage < totalPages ? currentPage + 1 : totalPages,
      currentPage === totalPages,
    );
    addNavigationButton('Last', totalPages, currentPage === totalPages);

    paginationDiv.appendChild(paginationList);
  }
}

async function fetchLogs(page) {
  const logsListDiv = document.querySelector('.logList');
  const logListItems = logsListDiv.querySelector('.logListItems');
  logsListDiv.classList.remove('hidden');

  const agentId = (document.querySelector('#agentId') as HTMLInputElement).value;
  const tag = (document.querySelector('#tag') as HTMLInputElement).value || '';
  const sessionID = (document.querySelector('#sessionID') as HTMLInputElement).value || '';
  try {
    logListItems.innerHTML = '';
    document.querySelector('.loading')?.classList?.remove('hidden');

    const logsDataResponse = await fetch(
      `/api/page/logs/${agentId}?page=${page}&tag=${tag}&sessionID=${sessionID}`,
    );
    const logsData = await logsDataResponse.json();

    if (tag || sessionID) {
      showLogsDetail(logsData);
    } else {
      showLogsList(logsData);
    }
  } catch (error) {
    console.error('Error fetching logs', error);
  } finally {
    document.querySelector('.loading')?.classList?.add('hidden');
  }
}

function renderLogTags(logTags, tagsContainer, isRounded = true) {
  if (logTags) {
    const tags = logTags.split(',');
    for (let tag of tags) {
      const span = document.createElement('span');
      span.className = `flex items-center bg-gray-200 text-gray-800 text-xs font-medium cursor-pointer hover:opacity-80 px-2.5 py-0.5 ${
        isRounded ? 'rounded' : ''
      }`;
      span.textContent = tag.trim();
      span.addEventListener('click', (event) => {
        event.stopPropagation();
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);
        params.set('tag', tag.trim());
        currentUrl.search = params.toString();
        document.location.href = currentUrl.toString();
      });
      tagsContainer.appendChild(span);
    }
  }
}

function formatLogDate(date) {
  return `${new Date(date).toLocaleDateString()} ${new Date(date).toLocaleTimeString()}`;
}

function showLogsDetail(logsData) {
  const agentId = (document.querySelector('#agentId') as HTMLInputElement).value;
  document.querySelector('.logDetails').classList.remove('hidden');
  document.querySelector('.logList').remove();
  document.querySelector('.breadcrumb-last-item')?.classList?.remove('hidden');
  const breadcrumbParentLink = document.querySelector('.breadcrumb-parent-link') as HTMLLinkElement;
  breadcrumbParentLink.setAttribute('href', `/logs/${agentId}`);
  breadcrumbParentLink.removeAttribute('disabled');

  const data = logsData.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const logs = document.querySelector('.logs');
  logs.innerHTML = '';

  for (let log of data) {
    const logTpl = document.querySelector('#logDetailsTemplate').cloneNode(true) as HTMLElement;
    logTpl.removeAttribute('id');

    const logElement = logTpl;

    const metaDiv = logElement.querySelector('.metadata');
    const callTreeDiv = logElement.querySelector('.call-tree');
    metaDiv.innerHTML = metaDiv.innerHTML
      .replace(/\{\{\s*createdAt\s*\}\}/g, formatLogDate(log.inputTimestamp))
      .replace(/\{\{\s*updatedAt\s*\}\}/g, formatLogDate(log.outputTimestamp));

    const tagsContainer = metaDiv.querySelector('._tags');
    tagsContainer.innerHTML = '';
    renderLogTags(log.tags, tagsContainer, false);

    const contentDiv = logElement.querySelector('.content');

    const entryTemplate = logElement.querySelector('.entryTpl').cloneNode(true) as HTMLElement;
    entryTemplate.removeAttribute('class');

    const cptEntry = entryTemplate.cloneNode(true) as HTMLElement;
    cptEntry.querySelector('.heading').innerHTML = 'Components';
    cptEntry.querySelector('.content').innerHTML = `${log.sourceName} => ${log.componentName}`;
    contentDiv.appendChild(cptEntry);

    if (log.input) {
      log.input.preview = escapeHtml(log.input?.preview);
      const entryName = log.input.action && log.input.status ? 'Status Update' : 'Inputs';
      addLogEntry(entryName, log.input, contentDiv);
    }
    if (log.output) {
      log.output.preview = escapeHtml(log.output?.preview);
      addLogEntry('Outputs', log.output, contentDiv);
    }
    if (log.result) {
      log.result.preview = escapeHtml(log.result?.preview);
      addLogEntry('Result', log.result, contentDiv);
    }
    if (log.error) {
      if (typeof log.error === 'string') log.error = { preview: log.error, full: null };
      log.error.preview = escapeHtml(log.error?.preview);
      addLogEntry('Error', log.error, contentDiv);
    }
    if (log.componentId === 'AGENT') {
      const callTreeButton = callTreeDiv.querySelector('.call-tree-button');
      callTreeButton.classList.remove('hidden');
      callTreeButton.addEventListener('click', function () {
        renderCallTree(data.filter((x) => x.workflowID === log.workflowID));
      });
    }

    entryTemplate.remove();
    logElement.classList.remove('hidden');
    logs.appendChild(logElement);
  }

  const downloadButton = document.getElementById('downloadButton');
  const backButton = document.getElementById('backButton') as HTMLLinkElement;
  downloadButton.addEventListener('click', async function () {
    if (downloadButton.getAttribute('data-downloading') === 'true') return;
    downloadButton.setAttribute('data-downloading', 'true');

    downloadButton.innerHTML = 'Compiling log...';
    const newData = (() => {
      try {
        return JSON.parse(JSON.stringify(data));
      } catch (error) {
        console.error('Error parsing log data', error);
        return [];
      }
    })();
    const promises = [];
    newData.forEach((log) => {
      log.targetId = log.componentId;
      delete log.componentId;

      log.targetName = log.componentName;
      delete log.componentName;

      delete log.inputTokens;
      delete log.outputTokens;

      const entries = ['input', 'output', 'result'];
      for (let entry of entries) {
        if (!log[entry]) continue;
        if (log[entry]?.full) {
          const loadData = async () => {
            const fullInput = await readFullData(log[entry].full);
            log[entry] = fullInput;
            try {
              log[entry] = JSON.parse(fullInput);
            } catch (error) {}
          };
          promises.push(loadData);
        } else {
          log[entry] = log[entry].preview;
          try {
            log[entry] = JSON.parse(log[entry]);
          } catch (error) {}
        }
      }
    });

    await PromiseAllConcurrent(4)(promises);

    downloadButton.innerHTML = 'Downloading...';
    // Convert the JSON object to a string
    const jsonString = JSON.stringify(newData, null, 2);

    // Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a link element
    const link = document.createElement('a');

    // Set the download attribute with a filename
    link.download = 'log.json';

    // Create a URL for the Blob and set it as the href of the link
    link.href = window.URL.createObjectURL(blob);

    // Append the link to the body (it can be invisible)
    document.body.appendChild(link);

    // Simulate a click on the link to start the download
    link.click();

    // Remove the link after downloading
    document.body.removeChild(link);

    downloadButton.removeAttribute('data-downloading');
    downloadButton.innerHTML = '<i class="fa-solid fa-download mr-2"></i>Download Log';
  });
  downloadButton.classList.remove('hidden');
  // set href value for back button
  backButton && (backButton.href = `/logs/${agentId}`);
}

function addLogEntry(enryName, logEntry, contentDiv) {
  const entryTemplate = contentDiv.querySelector('.entryTpl').cloneNode(true) as HTMLElement;
  entryTemplate.removeAttribute('class');

  const containerDiv = entryTemplate;
  contentDiv.appendChild(containerDiv);

  containerDiv.querySelector('.heading h3').textContent = enryName;

  const dataDiv = containerDiv.querySelector('.content');

  if (!logEntry.full) {
    dataDiv.querySelector('.preview .wrapper').innerHTML = logEntry.preview;

    try {
      const data = JSON.parse(logEntry.preview);
      const wrapper = dataDiv.querySelector('.wrapper');
      wrapper.innerHTML = '';
      const tree = jsonTree.create(data, wrapper);
      setTreeFunctions(containerDiv, tree);
    } catch (error) {}
  } else {
    dataDiv.querySelector('.preview').innerHTML =
      logEntry.preview.substring(0, 100) + '... (Large content hidden)';

    //dataDiv.innerHTML = `<div class="preview">${logEntry.preview.substring(0, 100)}... (Large content hidden) </div>`;
    const inputButton = document.createElement('button');
    inputButton.className = 'text-blue-300';
    inputButton.innerHTML = ' [ Load Full Content ]';
    inputButton.addEventListener('click', async () => {
      inputButton.innerHTML = 'Loading...';
      let fullDiv = dataDiv.querySelector('.full');
      let previewDiv = dataDiv.querySelector('.preview');
      if (!fullDiv) {
        fullDiv = document.createElement('div');
        fullDiv.className = 'full bg-gray-350 hidden';
        fullDiv.innerHTML = `<div class="full"><div class=" text-gray-200 text-xs p-2">${logEntry.preview}</div></div>`;
        let fullInput;
        try {
          fullInput = await readFullData(logEntry.full);
          fullDiv.innerHTML = `<div class="full"><div class="wrapper text-gray-200 text-xs p-2"></div></div>`;
          dataDiv.appendChild(fullDiv);

          const data = JSON.parse(fullInput);
          const wrapper = dataDiv.querySelector('.wrapper');

          const tree = jsonTree.create(data, wrapper);
          setTreeFunctions(containerDiv, tree);
        } catch (error) {
          fullDiv.innerHTML = `<div class="full"><div class="wrapper text-gray-200 text-xs p-2">${fullInput}</div></div>`;
        }
      }

      previewDiv.classList.toggle('hidden');
      fullDiv.classList.toggle('hidden');

      if (fullDiv.classList.contains('hidden')) {
        inputButton.innerHTML = ' [ Load Full Content ]';
      } else {
        inputButton.innerHTML = ' [ Hide Full Content ]';
        inputButton.classList.add('hidden');
      }
    });
    dataDiv.appendChild(inputButton);
  }

  return containerDiv;
}

function setTreeFunctions(containerDiv, tree) {
  const expandBtn: HTMLElement = containerDiv.querySelector('.expand-tree');

  for (let node of tree.rootNode.childNodes) {
    if (node.isComplex) {
      expandBtn.classList.remove('hidden');
      expandBtn.addEventListener('click', () => {
        if (expandBtn.innerText == 'Expand') {
          expandBtn.innerText = 'Collapse';
          tree.expand();
        } else {
          expandBtn.innerText = 'Expand';
          tree.collapse();
        }
      });

      break;
    }
  }
}

const cache = {};
async function readFullData(id) {
  const agentId = (document.querySelector('#agentId') as HTMLInputElement).value;
  if (cache[id]) return cache[id];
  return fetch(`/api/page/logs/${agentId}/fulldata?id=${id}`).then(async (response) => {
    //response.text()

    const textArea: HTMLTextAreaElement = document.createElement('textarea');
    textArea.textContent = await response.text();
    cache[id] = textArea.innerHTML;

    return cache[id];
  });
}

const escapeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

function renderCallTree(rawData) {
  if (rawData.some((item) => item.componentName === 'For Each')) {
    const treeHTML = `<p>This workflow contains a loop which is not supported yet in the Call Tree view.</p>`;
    createModalForLogs(treeHTML);
    return;
  }
  // Always make sure the item (with componentId 'AGENT') is at the first index
  rawData.sort((a, b) => (a.componentId === 'AGENT' ? -1 : b.componentId === 'AGENT' ? 1 : 0));

  let idCounter = 0;
  const idMap = new Map();
  const parentChildrenMap = new Map();

  rawData.forEach((item) => {
    if (!idMap.has(item.componentId)) {
      idMap.set(item.componentId, idCounter++);
    }
    if (item.sourceId && !idMap.has(item.sourceId)) {
      idMap.set(item.sourceId, idCounter++);
    }

    if (item.sourceId) {
      if (!parentChildrenMap.has(item.sourceId)) {
        parentChildrenMap.set(item.sourceId, []);
      }
      parentChildrenMap.get(item.sourceId).push(item);
    }
  });

  parentChildrenMap.forEach((children, parentId) => {
    for (let i = 0; i < children.length - 1; i++) {
      children[i].nextSibling = idMap.get(children[i + 1].componentId);
    }
    children[children.length - 1].nextSibling = null;
  });

  const nodes = rawData.map((item) => ({
    ...item,
    numericId: idMap.get(item.componentId),
    numericParentId: item.sourceId ? idMap.get(item.sourceId) : null,
    nextSibling: item.nextSibling,
    workflowID: item.workflowID,
  }));

  const rootNodes = [];
  const buildTree = () => {
    const nodeMap = new Map();

    nodes.forEach((node) => {
      nodeMap.set(node.numericId, node);
      node.children = [];
    });

    nodes.forEach((node) => {
      if (node.numericParentId !== null && nodeMap.has(node.numericParentId)) {
        nodeMap.get(node.numericParentId).children.push(node);
      } else if (node.componentId === 'AGENT') {
        rootNodes.push(node);
      }
    });
  };

  buildTree();

  const generateHTML = (node, depth = 0) => {
    if (!node) return '';

    let html = `<div id="node_${node.numericId}" class="window window-hidden"
            data-id="${node.numericId}" data-parent="${node.numericParentId || ''}"
            data-first-child="${node.children[0] ? node.children[0].numericId : ''}"
            data-next-sibling="${node.nextSibling !== null ? node.nextSibling : ''}">
            ${node.componentName || 'Root'}
        </div>`;

    node.children.forEach((child) => {
      html += generateHTML(child, depth + 1);
    });

    return html;
  };

  const treeHTML = rootNodes.map((node) => generateHTML(node)).join('');
  createModalForLogs(treeHTML);
  document.getElementById('_treecall').click();
}

function createModalForLogs(treeHTML) {
  twModalDialog({
    title: 'Logs Call Tree (Alpha)',
    content: `<div class="h-[40vh] p-4" id="treemain"> ${treeHTML} </div>`,
    actions: [
      {
        label: 'Cancel',
        cssClass:
          'bg-white text-smyth-dark border-gray-300 hover:border-smyth-light hover:bg-[#F5F5F5]',
        callback: function (dialog) {
          // Do nothing, just close the dialog
        },
      },
    ],
  });
}
