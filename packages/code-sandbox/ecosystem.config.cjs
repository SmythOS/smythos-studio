module.exports = {
  apps: [
    {
      name: "smyth-code-sandbox",
      script: "./index.js",
      autorestart: true,
      exec_mode: "fork",
      watch: false,
      interpreter: "node",
      instances: 1,
      max_memory_restart: "500M",
      env: {
        PORT: "5055",
      },
    },
  ],
};
