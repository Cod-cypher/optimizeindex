// PM2 process definition — start with: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "optimizeindex",
      script: "dist/server.cjs",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
