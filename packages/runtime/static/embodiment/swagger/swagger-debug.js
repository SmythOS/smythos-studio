// Listening for a message from the parent
console.log('Swagger DEBUG Enabled');

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// Override window.fetch to add our custom headers
const originalFetch = window.fetch;
window.fetch = function customFetch(input, init) {
    // Create a new init object if none provided
    const modifiedInit = init ? { ...init } : {};

    // Create headers object if none exists
    const headers = new Headers(modifiedInit.headers || {});

    // Add our custom header
    if (window._smyth_req_headers && typeof window._smyth_req_headers === 'object') {
        for (const [key, value] of Object.entries(window._smyth_req_headers)) {
            headers.set(key, value);
        }
    }

    // Update the init object with modified headers
    modifiedInit.headers = headers;

    // Call original fetch with modified config
    return originalFetch.call(window, input, modifiedInit);
};

const rpcFunctions = {
    attachHeaders: attachHeaders,
};
let origin = '';
let agentId;
function initDebug(_origin, _agentId) {
    origin = _origin;
    agentId = _agentId;
    window.addEventListener('message', function (event) {
        // Check the origin to make sure we're receiving a message from the expected domain
        console.log('Received message from parent:', event.data);
        if (event.origin !== origin) {
            return; // Not the expected sender, ignore the message
        }

        try {
            const jsonRPC = JSON.parse(event.data);
            if (jsonRPC.function && typeof rpcFunctions[jsonRPC.function] === 'function') {
                const args = jsonRPC.args || [];
                rpcFunctions[jsonRPC.function].apply(null, args);
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

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOMContentLoaded swagger-debug.js');
    document.body.addEventListener('click', function (event) {
        // Check if the clicked element matches your selector
        if (event.target.matches('button.btn.execute')) {
            console.log('Button clicked:', event.target);
            const btn = event.target;

            callParentFunction('debugLastAction', [], 500);
        }
    });
});

function attachHeaders(headersMap) {
    window._smyth_req_headers = { ...(window._smyth_req_headers || {}), ...headersMap };
}
