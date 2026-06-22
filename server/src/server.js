require('dotenv').config();

const app = require('./app');
const { sequelize, testConnection } = require('./config/database');

const PORT = Number(process.env.PORT) || 5000;

const listen = () => new Promise((resolve, reject) => {
  const server = app.listen(PORT, () => resolve(server));
  server.once('error', reject);
});

const stopServer = async (server, signal) => {
  console.log(`Received ${signal}, shutting down`);

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await sequelize.close();
  console.log('Server stopped');
};

const registerShutdownHandlers = (server) => {
  let shutdownStarted = false;

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => {
      if (shutdownStarted) {
        return;
      }

      shutdownStarted = true;
      stopServer(server, signal)
        .then(() => {
          process.exitCode = 0;
        })
        .catch((error) => {
          console.error('Graceful shutdown failed:', error);
          process.exitCode = 1;
        });
    });
  }
};

const startServer = async () => {
  await testConnection();
  const server = await listen();
  registerShutdownHandlers(server);
  console.log(`Server running on port ${PORT}`);
  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  startServer,
  stopServer
};
