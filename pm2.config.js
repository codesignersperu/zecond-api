module.exports = {
  apps: [
    {
      name: 'zecond-api',
      script: 'bun',
      args: 'run start:prod',
      cwd: '/home/ubuntu/zecond-api',
      autorestart: true,
      max_restarts: 50,
      min_uptime: '10s',
      restart_delay: 1000,
      exp_backoff_restart_delay: 100,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/ubuntu/.pm2/logs/zecond-api-error.log',
      out_file: '/home/ubuntu/.pm2/logs/zecond-api-out.log',
      log_file: '/home/ubuntu/.pm2/logs/zecond-api.log',
    },
  ],
};
