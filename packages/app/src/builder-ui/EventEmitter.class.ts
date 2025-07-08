export default class EventEmitter {
  private events: { [key: string]: Function[] };

  constructor() {
    this.events = {};
  }

  addEventListener(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  removeEventListener(event: string, listener: Function) {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter((l) => l !== listener);
  }
  on(event: string, listener: Function) {
    this.addEventListener(event, listener);
  }
  off(event: string, listener: Function) {
    this.removeEventListener(event, listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach((listener) => listener.apply(this, args));
  }
}
