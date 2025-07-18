module.exports = {
  apps: [
    {
      name: 'logan-dashboard',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'logan-mcp-server',
      script: 'python3',
      args: 'logan_mcp.py',
      cwd: process.env.LOGAN_MCP_SERVER_PATH || '../Documents/Cline/MCP/logan-fastmcp',
      env: {
        PYTHONPATH: process.env.LOGAN_MCP_SERVER_PATH || '../Documents/Cline/MCP/logan-fastmcp'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/mcp-err.log',
      out_file: './logs/mcp-out.log',
      log_file: './logs/mcp-combined.log',
      time: true
    }
  ]
};
