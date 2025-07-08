document.addEventListener('DOMContentLoaded', () => {
    var detected = false;
    let itv = setInterval(() => {
        if (!detected) detected = [...document.querySelectorAll('button')].find((d) => d.innerText.includes('Cancel loading dashboard'));

        if (!detected) return;
        if ([...document.querySelectorAll('button')].find((d) => d.innerText.includes('Cancel loading dashboard'))) return;

        clearInterval(itv);
        console.log('grafana proxy ready');

        runScripts();
    }, 50);
});

function runScripts() {
    $('.main-view > div > div:first').remove();
    $('#mega-menu-toggle').remove();
    $('nav').remove();
    $('button[aria-label*="favorite"]').remove();
    $('button[aria-label*="Share"]').remove();
    $('button[aria-label*="Auto refresh"]').remove();
    $('div[class*="NavToolbar-actions"] > button').remove();
    // document.querySelector('[aria-label="Profile"]').parentElement.parentElement.remove();
    // const toggleButton = document.querySelector('div[class*="NavToolbar-actions"] > button');
    // toggleButton.previousElementSibling.remove();
    // toggleButton.remove();

    // document.querySelector('.refresh-picker').remove();
}
