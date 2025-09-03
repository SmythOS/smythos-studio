// Listening for a message from the parent
console.log('DEBUG Enabled');

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

const rpcFunctions = {
    openChatBot: openChatBot,
    updateStatus: updateStatus,
    attachHeaders: attachHeaders,
};
let origin;
let agentId;
function initDebug(_origin, _agentId) {
    origin = _origin;
    agentId = _agentId;
    window.addEventListener('message', function (event) {
        // Check the origin to make sure we're receiving a message from the expected domain
        console.log('Received message from parent:', event.origin, event.data);
        if (event.origin !== origin) {
            return; // Not the expected sender, ignore the message
        }

        try {
            const jsonRPC = JSON.parse(event.data);
            if (jsonRPC.function && typeof rpcFunctions[jsonRPC.function] === 'function') {
                const args = jsonRPC.args || [];
                rpcFunctions[jsonRPC.function].apply(null, args);
                console.log('calling function', jsonRPC.function, args);
            } else {
                console.error('Invalid jsonRPC call', jsonRPC);
            }
        } catch (e) {
            console.error('Invalid jsonRPC call', e);
        }

        // Optionally, reply back to the parent
        //event.source.postMessage('Hello back from iframe', origin);
    });
}
//local functions
async function callParentFunction(functionName, args, ms = 0) {
    const jsonRPC = {
        function: functionName,
        args: args,
    };
    await delay(ms);
    window.parent.postMessage(JSON.stringify(jsonRPC), origin);
}

async function updateStatus(status) {
    const statusElement = document.querySelector('#plugin-call-message');
    if (!statusElement) return;
    statusElement.innerText = status;
}

async function attachHeaders(headersMap) {
    window._smyth_req_headers = { ...(window._smyth_req_headers || {}), ...headersMap };
}

// RPC functions exposed to the parent
function openChatBot() {
    const chatBtn = document.querySelector('button');
    if (!chatBtn) return;
    const isOpen = chatBtn?.querySelector('.fa-chevron-down');
    if (isOpen) return;
    chatBtn.click();
}

/*
example call from parent
let childUrl = 'https://<agent_id>.agent.stage.smyth.ai'
iframeElement = document.getElementById('chatbot-iframe');
iframeElement.contentWindow.postMessage('Hello from parent', childUrl);
*/
