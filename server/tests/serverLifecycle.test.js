const mockHttpServer = {
  once: jest.fn(),
  close: jest.fn((callback) => callback())
};
const mockListen = jest.fn((port, callback) => {
  queueMicrotask(callback);
  return mockHttpServer;
});

jest.mock('../src/app', () => ({
  listen: mockListen
}));

jest.mock('../src/config/database', () => ({
  sequelize: {
    close: jest.fn()
  },
  testConnection: jest.fn()
}));

const { sequelize, testConnection } = require('../src/config/database');
const { startServer, stopServer } = require('../src/server');

describe('runtime server lifecycle', () => {
  let processOnceSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    processOnceSpy = jest.spyOn(process, 'once').mockReturnValue(process);
  });

  afterEach(() => {
    processOnceSpy.mockRestore();
  });

  test('authenticates and starts serving without administrative operations', async () => {
    await expect(startServer()).resolves.toBe(mockHttpServer);

    expect(testConnection).toHaveBeenCalledTimes(1);
    expect(mockListen).toHaveBeenCalledWith(5000, expect.any(Function));
    expect(processOnceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processOnceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  test('drains HTTP requests and closes the database pool on shutdown', async () => {
    await stopServer(mockHttpServer, 'SIGTERM');

    expect(mockHttpServer.close).toHaveBeenCalledTimes(1);
    expect(sequelize.close).toHaveBeenCalledTimes(1);
  });
});
