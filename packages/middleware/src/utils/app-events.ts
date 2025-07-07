import EventEmitter from 'events';
import { createLogger } from '../../config/logging-v2';

const LOGGER = createLogger('AppEvents');

interface AppEventsMap {
  STARTUP: undefined;
  SHUTDOWN: undefined;
}

class AppEvents extends EventEmitter {
  on<EventName extends keyof AppEventsMap>(event: EventName, listener: (payload: AppEventsMap[EventName]) => void): this {
    LOGGER.info(`APP EVENT EMITTED: ${event}`);
    try {
      super.on(event, listener);
    } catch (err) {
      //* catch errors so that the app doesn't crash
      LOGGER.error(`Error on event ${event}`, err);
    }
    return this;
  }

  emit<EventName extends keyof AppEventsMap>(event: EventName, payload: AppEventsMap[EventName]): boolean {
    return super.emit(event, payload);
  }
}

export const appEvents: AppEvents = new AppEvents();

appEvents.on('STARTUP', () => {});
