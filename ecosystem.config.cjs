module.exports = {
  apps: [{
    name: "bts-delivery",
    cwd: "/root/bts/btsdeliveryapp",
    script: "dist/index.js",
    env: {
      NODE_ENV: "production",
      PORT: 5001
    },
    max_restarts: 10,
    restart_delay: 3000
  }]
};
