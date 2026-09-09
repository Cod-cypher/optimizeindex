// PM2 process definition — start with: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "optimizeindex",
      script: "dist/server.cjs",
      // Load-bearing. Four pieces of state live in the process rather than the
      // database, and every one of them silently becomes N times weaker at N
      // instances:
      //   - the login throttle          (server/auth.ts)
      //   - the audit rate limiter      (server/audit/ratelimit.ts)
      //   - the chat rate limiters      (server/chat/ratelimit.ts)
      //   - the monthly OpenAI token counter cache (server/chat/store.ts)
      //   - the in-flight turn steps      (server/chat/steps.ts)
      // The first two only cost CPU if they are loosened. The chat two cost
      // money. Before raising this, move the token counter and the handoff
      // email debounce into Postgres, then the three limiters behind one
      // shared backend.
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
