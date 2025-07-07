// import { Counter, Gauge, Histogram } from 'prom-client';
// import { CustomMetrics } from './interface';

// class TrafficCustomMetrics extends CustomMetrics {
//   public responseTime: Histogram;
//   public errorCounter: Counter;

//   constructor() {
//     super();
//     this.responseTime = new Histogram({
//       name: this.name('response_time_seconds'),
//       help: 'Duration of HTTP requests',
//       labelNames: ['method', 'path'],
//       buckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 15, 30, 60],
//     });

//     this.errorCounter = new Counter({
//       name: this.name('error_count'),
//       help: 'Counter for HTTP errors',
//       labelNames: ['method', 'path', 'status'],
//     });
//   }

//   registerMetrics(register: { registerMetric: (metric: any) => void }) {
//     register.registerMetric(this.responseTime);
//     register.registerMetric(this.errorCounter);
//   }
// }

// const trafficCustomMetrics = new TrafficCustomMetrics();

// export default trafficCustomMetrics;
