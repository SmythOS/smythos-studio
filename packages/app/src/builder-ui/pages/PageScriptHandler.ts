import builderScripts from './builder';
//import agentsScript from './agents';

export default class PageScriptHandler {
  static pages = {};
  static register(pathname, script) {
    if (this.pages[pathname] == undefined) {
      this.pages[pathname] = [];
    }
    this.pages[pathname].push(script);
  }

  static loadScripts(pageName) {
    for (let script of this.pages[pageName]) {
      script();
    }
  }
  static runPageScripts(location) {
    const url = new URL(location);

    const pathname = url.pathname.replace(/\/$/, '');
    //remove trailing slash
    //const pageName = '/' + pathname.split(/[\/]/)?.[1];

    if (this.pages[pathname] != undefined) {
      //console.log('Running page scripts for ' + pathname);
      this.loadScripts(pathname);
      return;
    }

    // If no exact match found, search for best match
    let bestMatchKey = '';
    for (let key in this.pages) {
      if (pathname.startsWith(key) && key.length > bestMatchKey.length) {
        bestMatchKey = key;
      }
    }

    if (bestMatchKey) {
      this.loadScripts(bestMatchKey);
    }
  }
}

//Register the page script here
//you can register multiple scripts for the same path
//PageScriptHandler.register('', agentsScript);
PageScriptHandler.register('/builder', builderScripts);
//PageScriptHandler.register('/studio', builderScripts);
