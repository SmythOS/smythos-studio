import { Component } from '../components/Component.class';
import { delay, uid } from '../utils';

export class ClipboardManager {
  constructor(private workspace) {}

  write(text) {
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('Copy');
    document.body.removeChild(input);
  }
  async read() {
    return navigator.clipboard.readText();
  }

  copySelection() {
    const list = [...document.querySelectorAll('.component.selected')];
    const selectedComponentsIds = list.map((c) => c.id);
    const components = list.map((domComponent: any) => {
      const control: Component = domComponent._control;

      return {
        id: domComponent.id,
        name: domComponent.querySelector('.title-bar').getAttribute('smt-name'), // added name to export
        outputs: [...domComponent.querySelectorAll('.output-endpoint')].map(
          (outputDomElement, index) => ({
            name: outputDomElement.getAttribute('smt-name'),
            color: outputDomElement.getAttribute('smt-color'),
            //description: c.getAttribute('smt-description'),
            ...this.workspace.extractComponentOutputProps(domComponent, outputDomElement),
            index,
            uuid: outputDomElement.endpoint?.getUuid(),
            default: control.properties.defaultOutputs.includes(
              outputDomElement.getAttribute('smt-name'),
            ),
          }),
        ),
        inputs: [...domComponent.querySelectorAll('.input-endpoint')].map(
          (inputDomElement, index) => ({
            name: inputDomElement.getAttribute('smt-name'),
            type: inputDomElement.getAttribute('smt-type'), // [INPUT DATA TYPE]
            color: inputDomElement.getAttribute('smt-color'),
            //description: r.getAttribute('smt-description'),
            optional: inputDomElement.getAttribute('smt-optional') === 'true' ? true : false,
            ...this.workspace.extractComponentInputProps(domComponent, inputDomElement),
            index,
            uuid: inputDomElement.endpoint?.getUuid(),
            default: control.properties.defaultInputs.includes(
              inputDomElement.getAttribute('smt-name'),
            ),
          }),
        ),
        data: control.data,
        top: domComponent.style.top,
        left: domComponent.style.left,
        width: domComponent.style.width,
        height: domComponent.style.height,
        displayName: control.drawSettings.displayName,
        title: control.title,
        aiTitle: control.aiTitle,
        description: control.description,
        template: control.properties.template,
      };
    });

    const connections = this.workspace.jsPlumbInstance
      .getAllConnections()
      .map((connection) => {
        const source = connection.source;
        const target = connection.target;
        const sourceComponent = source.closest('.component');
        const targetComponent = target.closest('.component');

        if (!sourceComponent || !targetComponent) return null; //exclude connections that are not connected to components, these can be used for other visual stuff
        //also exclude connections that are connected to the components that are not in the selection
        if (
          !selectedComponentsIds.includes(sourceComponent.id) ||
          !selectedComponentsIds.includes(targetComponent.id)
        )
          return null;

        return {
          sourceId: source.closest('.component').id,
          sourceIndex: [...source.parentElement.querySelectorAll('.output-endpoint')].findIndex(
            (c) => c === source,
          ),
          targetId: target.closest('.component').id,
          targetIndex: [...target.parentElement.querySelectorAll('.input-endpoint')].findIndex(
            (r) => r === target,
          ),
        };
      })
      .filter((c) => c);

    // //find the top left component, set its top left to 0,0 and adjust all components positions accordingly
    // const topLeftComponent = components.reduce((prev, current) => {
    //   if (parseInt(current.top) < parseInt(prev.top)) {
    //     return current;
    //   } else if (parseInt(current.top) === parseInt(prev.top)) {
    //     if (parseInt(current.left) < parseInt(prev.left)) {
    //       return current;
    //     }
    //   }
    //   return prev;
    // });
    // const topLeftComponentTop = parseInt(topLeftComponent.top);
    // const topLeftComponentLeft = parseInt(topLeftComponent.left);
    // components.forEach((c) => {
    //   c.top = parseInt(c.top) - topLeftComponentTop + 'px';
    //   c.left = parseInt(c.left) - topLeftComponentLeft + 'px';
    // });

    // Find the top-left corner of the bounding box
    const topLeft = components.reduce(
      (acc, component) => {
        const top = parseInt(component.top);
        const left = parseInt(component.left);
        return {
          top: Math.min(acc.top, top),
          left: Math.min(acc.left, left),
        };
      },
      { top: Infinity, left: Infinity },
    );

    // Adjust component positions relative to the top-left corner
    components.forEach((component) => {
      component.top = `${parseInt(component.top) - topLeft.top}px`;
      component.left = `${parseInt(component.left) - topLeft.left}px`;
    });

    //generate new uid for each copied component and update the connections accordingly
    const newComponentsIds = [];
    components.forEach((c) => {
      const newId = uid();
      newComponentsIds.push({ oldId: c.id, newId });
      c.id = newId;
    });
    connections.forEach((c) => {
      const sourceId = newComponentsIds.find((e) => e.oldId === c.sourceId)?.newId || c.sourceId;
      const targetId = newComponentsIds.find((e) => e.oldId === c.targetId)?.newId || c.targetId;
      c.sourceId = sourceId;
      c.targetId = targetId;
    });

    const selection = { components, connections };

    return JSON.stringify({ components, connections, partial: true });
  }

  async pasteSelection(selectionStr: string, posX?: number, posY?: number): Promise<void> {
    const workspace = this.workspace;
    workspace._loading = true;
    try {
      const selection = typeof selectionStr === 'string' ? JSON.parse(selectionStr) : selectionStr;
      const { components } = selection;

      if (posX === undefined) posX = workspace.mouseCoords.x;
      if (posY === undefined) posY = workspace.mouseCoords.y;

      const cptIdMapping: Record<string, string> = {};

      // Create components asynchronously
      const createComponentsPromise = Promise.all(
        components.map(async (component) => {
          const newComponent = await workspace.addComponent(
            component.name,
            {
              outputs: component?.outputs?.map((c) => c.name) || [],
              inputs: component?.inputs?.map((r) => r.name) || [],
              outputProps: component?.outputs || [],
              inputProps: component?.inputs || [],
              data: component?.data || {},
              top: `${parseInt(component.top) + posY}px`,
              left: `${parseInt(component.left) + posX}px`,
              width: component.width,
              title: component.title || '',
              aiTitle: component.aiTitle || '',
              description: component.description || '',
              uid: uid(),
              template: component.template,
            },
            false,
          );

          newComponent.classList.add('selected');
          cptIdMapping[component.id] = newComponent.id;
        }),
      );

      // Wait for all components to be created
      await createComponentsPromise;
      const activeComponent: any = document.querySelector('.component.active');
      if (activeComponent?._control) activeComponent._control.closeSettings();

      await delay(50);

      const connections = [];
      // Add connections asynchronously
      const addConnectionsPromise = Promise.all(
        selection.connections.map(async (connection) => {
          await delay(~~(Math.random() * 100));

          try {
            // Remap IDs
            const sourceId = cptIdMapping[connection.sourceId];
            const targetId = cptIdMapping[connection.targetId];

            const sourceComponent = document.getElementById(sourceId);
            const targetComponent = document.getElementById(targetId);

            const sourceComponentInfo = selection.components.find(
              (c) => c.id === connection.sourceId,
            );
            const targetComponentInfo = selection.components.find(
              (c) => c.id === connection.targetId,
            );
            const sourceEpName = sourceComponentInfo.outputs[connection.sourceIndex].name;
            const targetEpName = targetComponentInfo.inputs[connection.targetIndex].name;

            let retries = 5;
            let retryMultiplier = 100;

            for (let i = 0; i < retries; i++) {
              //exponential backoff
              const nextDelay = ~~(Math.random() * 50) + i * retryMultiplier;
              try {
                const sourceEP: any = sourceComponent.querySelector(
                  `.output-endpoint[smt-name='${sourceEpName}']`,
                );
                const targetEP: any = targetComponent.querySelector(
                  `.input-endpoint[smt-name='${targetEpName}']`,
                );

                if (!sourceEP || !targetEP) {
                  await delay(nextDelay);
                  continue;
                }
                const conId = sourceEP.id + ':' + targetEP.id;
                if (connections.includes(conId)) continue; //skip existing connections ==> avoid duplicate connections

                const con: any = workspace.jsPlumbInstance.connect({
                  source: sourceEP.endpoint,
                  target: targetEP.endpoint,
                  detachable: true,
                  cssClass: 'exclude-panzoom',
                });

                this.workspace.updateConnectionStyle(con);
                connections.push(conId);

                //if everything went well break the loop
                break;
              } catch (error) {
                await delay(nextDelay);
              }
            }
          } catch (error) {
            console.error('Error adding connection:', error);
          }
        }),
      );

      // Wait for all connections to be added
      await addConnectionsPromise;

      console.log('selection pasted');

      // Make all components except the selected ones semi-transparent
      const unselectedComponents = document.querySelectorAll('.component:not(.selected)');
      unselectedComponents.forEach((c) => {
        c.classList.add('unselected');
      });

      await delay(100);
      workspace._loading = false;
    } catch (error) {
      console.error('Error pasting selection:', error);
    } finally {
      await delay(100);
      workspace._loading = false;
    }

    workspace.checkConnectionsConsistency();
  }

  copySelection_deprecated() {
    const list = [...document.querySelectorAll('.component.selected')];
    const componentsProps = list.map((c: any) => ({
      uid: c?.properties?.uid || c?._control?.uid,
      name: c._control.constructor.name,
      properties: JSON.parse(JSON.stringify(c._control.properties)),
      data: JSON.parse(JSON.stringify(c._control.data)),
      title: c._control.title,
      description: c._control.description,
      noteText: c?.querySelector('.note-text')?.innerHTML || '',
    }));
    //const copiedIDs = componentsProps.map((c) => c.properties.uid);

    //connections
    const allConnections = this.workspace.jsPlumbInstance
      .getAllConnections()
      .map((connection) => {
        const source = connection.source;
        const target = connection.target;
        const sourceComponent = source.closest('.component');
        const targetComponent = target.closest('.component');

        if (!sourceComponent || !targetComponent) return null;
        return {
          sourceId: source.closest('.component').id,
          sourceIndex: [...source.parentElement.querySelectorAll('.output-endpoint')].findIndex(
            (c) => c === source,
          ),
          targetId: target.closest('.component').id,
          targetIndex: [...target.parentElement.querySelectorAll('.input-endpoint')].findIndex(
            (r) => r === target,
          ),
        };
      })
      .filter((c) => c !== null);
    //only keep connections that are connected to the selected components
    const selectedComponentsIds = list.map((c: any) => c.id);
    const connections = allConnections.filter(
      (c) =>
        selectedComponentsIds.includes(c.sourceId) && selectedComponentsIds.includes(c.targetId),
    );

    //find the top left componentsProps, set its top left to 0,0 and adjust all components positions accordingly
    const topLeftComponent = componentsProps.reduce((prev, current) => {
      if (parseInt(current.properties.top) < parseInt(prev.properties.top)) {
        return current;
      } else if (parseInt(current.properties.top) === parseInt(prev.properties.top)) {
        if (parseInt(current.properties.left) < parseInt(prev.properties.left)) {
          return current;
        }
      }
      return prev;
    });
    const topLeftComponentTop = parseInt(topLeftComponent.properties.top);
    const topLeftComponentLeft = parseInt(topLeftComponent.properties.left);
    componentsProps.forEach((c) => {
      c.properties.top = parseInt(c.properties.top) - topLeftComponentTop + 'px';
      c.properties.left = parseInt(c.properties.left) - topLeftComponentLeft + 'px';
    });

    //generate new uid for each copied component and update the connections accordingly
    const newComponentsIds = [];
    componentsProps.forEach((c) => {
      const newId = uid();
      newComponentsIds.push({ oldId: c.uid, newId });
      c.properties.uid = newId;
      c.properties.top = parseInt(c.properties.top) + 100 + 'px';
      c.properties.left = parseInt(c.properties.left) + 40 + 'px';
    });
    connections.forEach((c) => {
      const sourceId = newComponentsIds.find((e) => e.oldId === c.sourceId)?.newId || c.sourceId;
      const targetId = newComponentsIds.find((e) => e.oldId === c.targetId)?.newId || c.targetId;
      c.sourceId = sourceId;
      c.targetId = targetId;
    });

    return JSON.stringify({ componentsProps, connections });
  }

  async pasteSelection_deprecated(text, posX?, posY?) {
    const workspace = this.workspace;
    const jsonData = JSON.parse(text);

    if (posX === undefined) posX = workspace.mouseCoords.x;
    if (posY === undefined) posY = workspace.mouseCoords.y;

    if (jsonData.name && jsonData.componentName) {
      console.log('pasting component template');
      //this is a template
      const properties = {
        uid: 'TPL' + uid(),
        top: posY + 'px',
        left: posX + 'px',
        sender: null,
        title: jsonData.name,
        description: jsonData.description,
        template: jsonData,
      };

      const componentElement = await workspace.addComponent(
        jsonData.componentName,
        properties,
        true,
      );
      const component = componentElement._control;
      for (let entry in jsonData.data) {
        component.data[entry] = jsonData.data[entry];
      }

      await delay(100);
      component.checkSettings();
      return;
    }

    //copy all selected components and connections
    const { componentsProps, connections } = jsonData;
    //workspace.writeToClipboard(JSON.stringify({ componentsProps, connections }));

    const newComponentsIds = [];
    componentsProps.forEach((c) => {
      const newId = uid();
      newComponentsIds.push({ oldId: c.properties.uid, newId });
      c.properties.uid = newId;
      c.properties.top = parseInt(c.properties.top) + posY + 'px';
      c.properties.left = parseInt(c.properties.left) + posX + 'px';
      c.properties.sender = null;
    });
    connections.forEach((c) => {
      const sourceId = newComponentsIds.find((e) => e.oldId === c.sourceId)?.newId || c.sourceId;
      const targetId = newComponentsIds.find((e) => e.oldId === c.targetId)?.newId || c.targetId;
      c.sourceId = sourceId;
      c.targetId = targetId;
    });

    let componentsCount = componentsProps.length;
    const componentPromise = new Promise((resolve) => {
      componentsProps.forEach(async (c) => {
        const cptDomElement = await workspace.addComponent(c.name, c.properties, false);
        for (let entry in c.data) {
          cptDomElement._control.data[entry] = c.data[entry];
          cptDomElement._control.title = c.title;
          cptDomElement._control.description = c.description;
          cptDomElement.classList.add('selected');
          const titleBar = cptDomElement.querySelector('.title-bar');
          const title: HTMLElement = titleBar.querySelector('.title');
          const description: HTMLElement = titleBar.querySelector('.description');
          title.textContent = c?.title;
          description.textContent = c.description;

          // Ensure components maintain proper z-index after paste
          if (!cptDomElement.style.zIndex) {
            cptDomElement.style.zIndex = '999'; // Paste new components on top
          }

          // Update the note component text, color and background
          const noteText = cptDomElement?.querySelector('.note-text');
          if (noteText) {
            noteText.innerHTML = c?.noteText || '';
            title.style.color = c?.data?.textColor || '#000'; // Set note title color
            noteText.style.color = c?.data?.textColor || '#000'; // Set note description color
            cptDomElement.style.backgroundColor = c?.data?.color || '#c7ff1529';
            cptDomElement.style.borderColor = c?.data?.color || '#c7ff1529';
          }
        }

        await delay(50);
        cptDomElement._control.checkSettings();
        componentsCount--;
        if (componentsCount <= 0) {
          await delay(300); //wait for all components to be added to the DOM before adding connections
          resolve(true);
        }
      });
    });

    await componentPromise;

    const activeComponent: any = document.querySelector('.component.active');
    if (activeComponent?._control) activeComponent._control.closeSettings();
    //add connections
    connections.forEach(async (c) => {
      const sourceComponent: any = document.querySelector(
        `#${c.sourceId} .output-endpoint:nth-child(${c.sourceIndex + 1})`,
      );
      const targetComponent: any = document.querySelector(
        `#${c.targetId} .input-endpoint:nth-child(${c.targetIndex + 1})`,
      );

      const conId = sourceComponent.endpoint.id + ':' + targetComponent.endpoint.id;
      const con: any = workspace.jsPlumbInstance.connect({
        source: sourceComponent.endpoint,
        target: targetComponent.endpoint,
        detachable: true,
        cssClass: 'exclude-panzoom',
      });
    });
  }
}
