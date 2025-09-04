function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function copyToClipboard(text) {
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('Copy');
    document.body.removeChild(input);
}
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Swagger Script Loaded');
    const curUrl = document.URL;
    const openApiUrl = curUrl.replace('swagger/', 'api-docs/openapi.json');

    await delay(500);
    const serversDiv = document.querySelector('.servers');
    if (serversDiv) {
        const div = document.createElement('div');
        div.setAttribute('style', 'margin: 10px 0px;font-size: 12px;');
        div.id = 'swagger-ui';
        div.innerHTML = `<b>OpenAPI Url : </b><a href="${openApiUrl}" target="_blank">${openApiUrl}</a>`;
        serversDiv.parentElement.appendChild(div);
    }

    const copyButtons = [...document.querySelectorAll('.copy-to-clipboard')];
    for (let button of copyButtons) {
        // Clone the button
        const buttonClone = button.cloneNode(true);

        // Replace the original button with the clone
        button.parentNode.replaceChild(buttonClone, button);

        buttonClone.addEventListener('click', async function () {
            const serverUrl = document.querySelector('.servers select').value;
            const path = buttonClone.parentElement.querySelector('span[data-path]').getAttribute('data-path');
            const fullUrl = serverUrl + path;
            console.log('Copy ', fullUrl);
            //const target = button.getAttribute('data-target');
            //const text = document.querySelector(target).innerText;
            //await navigator.clipboard.writeText(fullUrl);
            copyToClipboard(fullUrl);
        });
    }
});
