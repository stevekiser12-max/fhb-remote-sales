module.exports = {
  apps: [{
    name: 'fhb-lead-pilot',
    script: 'node_modules/.bin/next',
    args: 'start -p 3011',
    cwd: '/root/.openclaw/workspace/fhb-lead-pilot',
    env: {
      NODE_ENV: 'production',
      PORT: 3011,
    },
  }],
};
