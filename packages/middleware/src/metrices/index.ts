// import { collectDefaultMetrics, Registry, Pushgateway, register } from 'prom-client';
// import trafficCustomMetrics from './custom/traffic.custom.metrices';
// import businessCustomMetrics from './custom/business.custom.metrices';
// import { config } from '../../config/config';
// import { LOGGER } from '../../config/logging';
// import { METRIC_PREFIX } from './consts';

// export class MetricsManager {
//   private register: Registry;
//   private interval: NodeJS.Timeout;
//   private gateway: Pushgateway<'text/plain; version=0.0.4; charset=utf-8'>;

//   constructor() {
//     this.register = register;
//     this.gateway = new Pushgateway(config.variables.PUSHGATEWAY_URL);
//   }

//   public get metricesRegister() {
//     return this.register;
//   }

//   public collectMetrices() {
//     collectDefaultMetrics({ register: this.metricesRegister, prefix: `${METRIC_PREFIX}_`, labels: { app: `middleware_${process.env.PORT}` } });
//     trafficCustomMetrics.registerMetrics(this.metricesRegister);
//     businessCustomMetrics.registerMetrics(this.metricesRegister);
//   }

//   public static getPrefix() {
//     return `middleware_${config.variables.env}`;
//   }

//   public async startExportingMetrices() {
//     this.interval = setInterval(() => {
//       this.exportMetrices().catch(error => LOGGER.error(error));
//     }, 1000 * 5); // 5 seconds
//   }

//   private async exportMetrices() {
//     await this.gateway
//       .pushAdd({
//         jobName: `middleware_${config.variables.env}`,
//         groupings: { app: `middleware_${process.env.PORT.substring(2)}` },
//       })
//       .catch(error => LOGGER.error(error));
//     console.log('Metrics pushed to prometheus');
//   }

//   public stopExportingMetrices() {
//     if (!this.interval) {
//       return;
//     }
//     clearInterval(this.interval);
//   }
// }

// export const metricsManager = new MetricsManager();
