// import { Counter, Gauge, Histogram } from 'prom-client';
// import { CustomMetrics } from './interface';

// class BusinessCustomMetrics extends CustomMetrics {
//   public userSignupCounter: Counter;

//   constructor() {
//     super();
//     this.userSignupCounter = new Counter({
//       name: this.name('user_signup_count'),
//       help: 'Counter for user signups',
//       labelNames: ['status'],
//     });
//   }

//   registerMetrics(register: { registerMetric: (metric: any) => void }) {
//     console.log('Registering business custom metrics');
//     register.registerMetric(this.userSignupCounter);
//   }
// }

// const businessCustomMetrics = new BusinessCustomMetrics();

// export default businessCustomMetrics;
