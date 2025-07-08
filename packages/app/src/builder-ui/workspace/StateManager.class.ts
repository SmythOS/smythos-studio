import { Component } from '../components/Component.class';
import { delay } from '../utils';

/**
 * Manages the state of the workspace
 * This class enables to undo/redo actions in the workspace
 * it stores the diff between states for components and connections in order
 * to minimize the storage requirements and enhance undo/redo performances
 */
/**
 * NOTE : in the current implementation, we do not specifically handle updated components
 * we just consider that the updated component has been added and removed, which is not efficient,
 * in the future we should use a more efficient logic for updating components and only keep add/remove approach for complex cases
 */
export class StateManager {
  private lastState = { components: [], connections: [] };
  private state = [];
  private redoStack = [];
  public enabled = true;
  private queue = [];
  private processingQueue = false;
  private _saving = false;

  constructor(private workspace) {
    workspace.addEventListener('AgentLoaded', async (agent) => {
      //this.lastState = this.processState(await workspace.export(false)); //this will set lastState to current agent state
      this.lastState = this.processState(agent.data); //this will set lastState to current agent state
      this.state = [];
    });
    workspace.addEventListener('DataExported', (data) => {
      if (!this.enabled) return;

      this.queue.push(data);
      this.processQueue();
    });
  }

  public reset(initialState?) {
    if (initialState) {
      this.lastState = this.processState(initialState);
    }
    this.state = [];
  }
  private async processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;
    while (this.queue.length > 0) {
      if (this.locked) {
        //console.log('StateManager - processQueue Locked, will retry');
        await delay(30);
        continue;
      }
      const data = this.queue.shift();
      this.saveState(data);
    }
    this.processingQueue = false;
  }
  diffState(newState) {
    const diff = {
      add: { components: [], connections: [] },
      remove: { components: [], connections: [] },
      update: { components: [], connections: [] },
    };

    const lastStateComponentIDs = this.lastState.components.map((c) => c.id);
    const newStateComponentIDs = newState.components.map((c) => c.id);

    //find added components
    const newComponents = newState.components.filter((c) => !lastStateComponentIDs.includes(c.id));
    diff.add.components = newComponents;

    //find removed components
    const removedComponents = this.lastState.components.filter(
      (c) => !newStateComponentIDs.includes(c.id),
    );
    diff.remove.components = removedComponents;

    const lastStateConnectionsIDs = this.lastState.connections.map(
      (c) => `${c.sourceId}:${c.sourceIndex},${c.targetId}:${c.targetIndex}`,
    );
    const newStateConnectionsIDs = newState.connections.map(
      (c) => `${c.sourceId}:${c.sourceIndex},${c.targetId}:${c.targetIndex}`,
    );

    //find added connections
    const newConnections = newState.connections.filter(
      (c) => !lastStateConnectionsIDs.includes(c.id),
    );
    diff.add.connections = newConnections;

    //find removed connections
    const removedConnections = this.lastState.connections.filter(
      (c) => !newStateConnectionsIDs.includes(c.id),
    );
    diff.remove.connections = removedConnections;

    //find updated components by comparing stringified representation of components having the same id in lastState and newState
    const updatedComponents = newState.components
      .filter((c) => {
        const lastStateComponent = this.lastState.components.find((c2) => c2.id === c.id);
        return lastStateComponent && JSON.stringify(c) !== JSON.stringify(lastStateComponent);
      })
      .map((c) => c.id);

    diff.remove.components.push(
      ...this.lastState.components.filter((c) => updatedComponents.includes(c.id)),
    );
    diff.add.components.push(
      ...newState.components.filter((c) => updatedComponents.includes(c.id)),
    );

    //keep a updated component IDs list for future use (optimized component update state)
    diff.update.components = updatedComponents;

    // console.log(
    //   '>>> state Diff',
    //   diff.add.components,
    //   diff.remove.components,
    //   diff.add.connections,
    //   diff.remove.connections,
    // );

    if (
      diff.add.components.length === 0 &&
      diff.remove.components.length === 0 &&
      diff.add.connections.length === 0 &&
      diff.remove.connections.length === 0
    ) {
      return;
    }

    //clear redo stack => new state is a new version of the current state
    this.redoStack = [];

    this.state.push(diff);
  }

  private processState(state) {
    const copy = JSON.parse(JSON.stringify(state));
    //rewrite the connections in a way that makes them easy to compare
    copy.connections = copy.connections.map((c) => ({
      ...c,
      id: `${c.sourceId}:${c.sourceIndex},${c.targetId}:${c.targetIndex}`,
    }));
    return copy;
  }

  saveState(newState) {
    if (!newState) return;
    this.lock();
    try {
      let state = this.processState(newState);
      this.diffState(state);
      this.lastState = state;
    } catch (error) {
      console.warn('Error during saveState', error);
    }

    setTimeout(this.unlock.bind(this), 100);
  }
  private get locked() {
    return this._saving;
  }
  private lock() {
    this._saving = true;
    this.workspace._loading = true;
  }
  private unlock() {
    this._saving = false;
    this.workspace._loading = false;
  }

  async undo() {
    if (this.locked) return;
    const state = this.state.pop();
    if (!state) return;
    this.redoStack.push(state);

    this.lock();
    try {
      //delete added connections first
      for (let c of state.add?.connections || []) {
        const sourceComponent = document.getElementById(c.sourceId);
        const targetComponent = document.getElementById(c.targetId);
        if (!sourceComponent || !targetComponent) continue;

        const source = sourceComponent.querySelectorAll('.output-container .endpoint')[
          c.sourceIndex
        ];
        const target = targetComponent.querySelectorAll('.input-container .endpoint')[
          c.targetIndex
        ];
        if (!source || !target) continue;

        const cons = this.workspace.jsPlumbInstance.getConnections({
          source,
          target,
        });

        //console.log('Deleting connection', cons);
        this.workspace.jsPlumbInstance.deleteConnection(cons[0], { force: true });
      }
      await delay(50);

      //delete added components
      let saveConnections = [];
      let deletedComponents = [];
      for (let cpt of state.add?.components || []) {
        const domElt: any = document.getElementById(cpt.id);
        const component: Component = domElt._control;

        //get all connections attached to the component so we can restore them later
        const targetEPList = [...domElt.querySelectorAll('.input-container .endpoint')].map(
          (e) => e.id,
        );
        const sourceEPList = [...domElt.querySelectorAll('.output-container .endpoint')].map(
          (e) => e.id,
        );

        const targetConList = this.workspace.jsPlumbInstance
          .getConnections({
            target: targetEPList,
          })
          .map((c) => {
            const sourceEPId = c.source.id;
            const targetEPId = c.target.id;
            const sourceId = document.getElementById(sourceEPId).closest('.component').id;
            const targetId = document.getElementById(targetEPId).closest('.component').id;
            const sourceIndex = [
              ...document.getElementById(sourceEPId).parentElement.querySelectorAll('.endpoint'),
            ]
              .map((e) => e.id)
              .indexOf(sourceEPId);
            const targetIndex = [
              ...document.getElementById(targetEPId).parentElement.querySelectorAll('.endpoint'),
            ]
              .map((e) => e.id)
              .indexOf(targetEPId);
            return { sourceId, targetId, sourceIndex, targetIndex };
          });
        const sourceConList = this.workspace.jsPlumbInstance
          .getConnections({
            source: sourceEPList,
          })
          .map((c) => {
            const sourceEPId = c.source.id;
            const targetEPId = c.target.id;
            const sourceId = document.getElementById(sourceEPId).closest('.component').id;
            const targetId = document.getElementById(targetEPId).closest('.component').id;
            const sourceIndex = [
              ...document.getElementById(sourceEPId).parentElement.querySelectorAll('.endpoint'),
            ]
              .map((e) => e.id)
              .indexOf(sourceEPId);
            const targetIndex = [
              ...document.getElementById(targetEPId).parentElement.querySelectorAll('.endpoint'),
            ]
              .map((e) => e.id)
              .indexOf(targetEPId);
            return { sourceId, targetId, sourceIndex, targetIndex };
          });

        saveConnections.push(...targetConList, ...sourceConList);

        component.delete();
        deletedComponents.push('#' + cpt.id);
      }

      //wait until all components are deleted from DOM
      let maxWaitCount = 30;
      while (
        deletedComponents.length > 0 &&
        document.querySelectorAll(deletedComponents.join(',')).length > 0 &&
        maxWaitCount > 0
      ) {
        await delay(33);
        maxWaitCount--;
      }

      const pendingComponents = {};
      //add new components
      for (let component of state.remove?.components || []) {
        pendingComponents[component.id] = true;
        const newComponent = this.workspace.addComponent(
          component.name,
          {
            outputs: component.outputs.map((c) => c.name),
            inputs: component.inputs.map((r) => r.name),
            outputProps: component.outputs,
            inputProps: component.inputs,
            data: component.data,
            top: component.top,
            left: component.left,
            width: component.width,
            title: component.title || '',
            aiTitle: component.aiTitle || '',
            description: component.description || '',
            uid: component.id,
            template: component.template,
          },
          false,
        );
      }

      maxWaitCount = 30;
      while (Object.keys(pendingComponents).length > 0 && maxWaitCount > 0) {
        const keys = Object.keys(pendingComponents);
        for (let key of keys) {
          const component = document.getElementById(key);
          if (component) {
            delete pendingComponents[key];
          }
        }
        await delay(33);
        maxWaitCount--;
      }

      //wait for endpoints to be created
      await delay(300); //sometimes components inputs take time to be created, this is just a temporary fix, we need to find a better way to wait for inputs to be created
      //FIXME: find a better way to do wait for endpoints to be created

      let restorableConnections = [];
      //combine saveConnections and state.remove?.connections and deduplicate them
      restorableConnections.push(...saveConnections, ...state.remove?.connections);
      restorableConnections = restorableConnections.filter(
        (c, index, self) =>
          index === self.findIndex((t) => t.sourceId === c.sourceId && t.targetId === c.targetId),
      );

      //restore saved connections of updated components
      if (restorableConnections.length > 0) {
        //restore connections
        for (let connection of restorableConnections) {
          const sourceComponent = document.getElementById(connection.sourceId);
          const targetComponent = document.getElementById(connection.targetId);
          if (!sourceComponent || !targetComponent) continue;

          const source: any = sourceComponent.querySelectorAll('.output-container .endpoint')?.[
            connection.sourceIndex
          ];
          const target: any = targetComponent.querySelectorAll('.input-container .endpoint')?.[
            connection.targetIndex
          ];
          if (!source || !target || !source?.endpoint || !target?.endpoint) continue;

          const con = this.workspace.jsPlumbInstance.connect({
            source: source.endpoint,
            target: target.endpoint,
            detachable: true,
            cssClass: 'exclude-panzoom',
          });
          this.workspace.updateConnectionStyle(con);
          await delay(5);
        }
      }

      // //restore new connections from state
      // for (let connection of state.remove?.connections || []) {
      //   const sourceComponent = document.getElementById(connection.sourceId);
      //   const targetComponent = document.getElementById(connection.targetId);
      //   if (!sourceComponent || !targetComponent) continue;

      //   const source: any = sourceComponent.querySelectorAll('.output-container .endpoint')?.[
      //     connection.sourceIndex
      //   ];
      //   const target: any = targetComponent.querySelectorAll('.input-container .endpoint')?.[
      //     connection.targetIndex
      //   ];
      //   if (!source || !target || !source?.endpoint || !target?.endpoint) continue;

      //   const con = this.workspace.jsPlumbInstance.connect({
      //     source: source.endpoint,
      //     target: target.endpoint,
      //     detachable: true,
      //     cssClass: 'exclude-panzoom',
      //   });
      //   this.workspace.updateConnectionStyle(con);
      // }

      await delay(100);

      this.lastState = this.processState(await this.workspace.export(false));
    } catch (error) {
      console.error('Error during undo', error);
    }
    this.unlock();
    this.workspace.saveAgent(undefined, undefined, undefined, undefined, false);

    return state;
  }

  async redo() {
    if (this.locked) return;
    const state = this.redoStack.pop();
    if (!state) return;
    this.state.push(state);

    this.lock();

    try {
      //delete removed connections first
      for (let connection of state.remove?.connections || []) {
        const sourceComponent = document.getElementById(connection.sourceId);
        const targetComponent = document.getElementById(connection.targetId);
        if (!sourceComponent || !targetComponent) continue;

        const source = sourceComponent.querySelectorAll('.output-container .endpoint')[
          connection.sourceIndex
        ];

        const target = targetComponent.querySelectorAll('.input-container .endpoint')[
          connection.targetIndex
        ];
        if (!source || !target) continue;

        const cons = this.workspace.jsPlumbInstance.getConnections({
          source,
          target,
        });

        //console.log('Deleting connection', cons);
        this.workspace.jsPlumbInstance.deleteConnection(cons[0], { force: true });
      }

      await delay(50);

      //delete added components
      let saveConnections = [];
      let deletedComponents = [];
      for (let cpt of state.remove?.components || []) {
        const domElt: any = document.getElementById(cpt.id);
        const component: Component = domElt._control;

        //get all connections attached to the component so we can restore them later
        const targetEPList = [...domElt.querySelectorAll('.input-container .endpoint')].map(
          (e) => e.id,
        );
        const sourceEPList = [...domElt.querySelectorAll('.output-container .endpoint')].map(
          (e) => e.id,
        );

        const targetConList = this.workspace.jsPlumbInstance
          .getConnections({
            target: targetEPList,
          })
          .map((c) => {
            const sourceEPId = c.source.id;
            const targetEPId = c.target.id;
            const sourceId = document.getElementById(sourceEPId).closest('.component').id;
            const targetId = document.getElementById(targetEPId).closest('.component').id;
            const sourceIndex = [
              ...document.getElementById(sourceEPId).parentElement.querySelectorAll('.endpoint'),
            ]
              .map((e) => e.id)
              .indexOf(sourceEPId);
            const targetIndex = [
              ...document.getElementById(targetEPId).parentElement.querySelectorAll('.endpoint'),
            ]
              .map((e) => e.id)
              .indexOf(targetEPId);
            return { sourceId, targetId, sourceIndex, targetIndex };
          });
        const sourceConList = this.workspace.jsPlumbInstance
          .getConnections({
            source: sourceEPList,
          })
          .map((c) => {
            const sourceEPId = c.source.id;
            const targetEPId = c.target.id;
            const sourceId = document.getElementById(sourceEPId).closest('.component').id;
            const targetId = document.getElementById(targetEPId).closest('.component').id;
            const sourceIndex = [
              ...document.getElementById(sourceEPId).parentElement.querySelectorAll('.endpoint'),
            ]
              .map((e) => e.id)
              .indexOf(sourceEPId);
            const targetIndex = [
              ...document.getElementById(targetEPId).parentElement.querySelectorAll('.endpoint'),
            ]
              .map((e) => e.id)
              .indexOf(targetEPId);
            return { sourceId, targetId, sourceIndex, targetIndex };
          });

        saveConnections.push(...targetConList, ...sourceConList);

        component.delete();
        deletedComponents.push('#' + cpt.id);
      }

      //wait until all components are deleted from DOM
      let maxWaitCount = 10;
      while (
        deletedComponents.length > 0 &&
        document.querySelectorAll(deletedComponents.join(',')).length > 0 &&
        maxWaitCount > 0
      ) {
        await delay(100);
        maxWaitCount--;
      }

      //add new components
      for (let component of state.add?.components || []) {
        const newComponent = await this.workspace.addComponent(
          component.name,
          {
            outputs: component.outputs.map((c) => c.name),
            inputs: component.inputs.map((r) => r.name),
            outputProps: component.outputs,
            inputProps: component.inputs,
            data: component.data,
            top: component.top,
            left: component.left,
            width: component.width,
            title: component.title || '',
            aiTitle: component.aiTitle || '',
            description: component.description || '',
            uid: component.id,
            template: component.template,
          },
          false,
        );
      }

      //wait for endpoints to be created
      await delay(300); //sometimes components inputs take time to be created, this is just a temporary fix, we need to find a better way to wait for inputs to be created
      //FIXME: find a better way to do wait for endpoints to be created

      //restore saved connections of updated components
      if (saveConnections.length > 0) {
        //restore connections
        for (let connection of saveConnections) {
          const sourceComponent = document.getElementById(connection.sourceId);
          const targetComponent = document.getElementById(connection.targetId);
          if (!sourceComponent || !targetComponent) continue;

          const source: any = sourceComponent.querySelectorAll('.output-container .endpoint')?.[
            connection.sourceIndex
          ];
          const target: any = targetComponent.querySelectorAll('.input-container .endpoint')?.[
            connection.targetIndex
          ];

          const con = this.workspace.jsPlumbInstance.connect({
            source: source.endpoint,
            target: target.endpoint,
            detachable: true,
            cssClass: 'exclude-panzoom',
          });
          this.workspace.updateConnectionStyle(con);
        }
      }

      //restore new connections from state
      for (let connection of state.add?.connections || []) {
        const sourceComponent = document.getElementById(connection.sourceId);
        const targetComponent = document.getElementById(connection.targetId);
        if (!sourceComponent || !targetComponent) continue;

        const source: any = sourceComponent.querySelectorAll('.output-container .endpoint')?.[
          connection.sourceIndex
        ];

        const target: any = targetComponent.querySelectorAll('.input-container .endpoint')?.[
          connection.targetIndex
        ];
        if (!source || !target || !source?.endpoint || !target?.endpoint) continue;

        const con = this.workspace.jsPlumbInstance.connect({
          source: source.endpoint,
          target: target.endpoint,
          detachable: true,
          cssClass: 'exclude-panzoom',
        });

        this.workspace.updateConnectionStyle(con);
      }
      await delay(100);

      this.lastState = this.processState(await this.workspace.export(false));
    } catch (error) {
      console.error('Error during redo', error);
    }
    this.unlock();
    this.workspace.saveAgent(undefined, undefined, undefined, undefined, false);
    return state;
  }

  initState() {}
}
