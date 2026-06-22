const mockDescribeTable = jest.fn();
const mockAddColumn = jest.fn();
const mockQueryInterface = {
  describeTable: mockDescribeTable,
  addColumn: mockAddColumn
};

jest.mock('../src/config/database', () => ({
  sequelize: {
    sync: jest.fn(),
    getQueryInterface: jest.fn(() => mockQueryInterface),
    close: jest.fn()
  },
  testConnection: jest.fn()
}));

jest.mock('../src/services/systemSettings', () => ({
  ensureDefaultSettings: jest.fn()
}));

const { DataTypes } = require('sequelize');
const { sequelize, testConnection } = require('../src/config/database');
const { ensureDefaultSettings } = require('../src/services/systemSettings');
const {
  ensureResultDurationColumn,
  runRelease
} = require('../src/release');

describe('release process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDescribeTable.mockResolvedValue({ durationSeconds: {} });
  });

  test('performs administrative work before the runtime process starts', async () => {
    await runRelease();

    expect(testConnection).toHaveBeenCalledTimes(1);
    expect(sequelize.sync).toHaveBeenCalledWith();
    expect(mockDescribeTable).toHaveBeenCalledWith('test_results');
    expect(ensureDefaultSettings).toHaveBeenCalledTimes(1);

    expect(testConnection.mock.invocationCallOrder[0])
      .toBeLessThan(sequelize.sync.mock.invocationCallOrder[0]);
    expect(sequelize.sync.mock.invocationCallOrder[0])
      .toBeLessThan(ensureDefaultSettings.mock.invocationCallOrder[0]);
  });

  test('adds the duration column only when it is absent', async () => {
    mockDescribeTable.mockResolvedValue({ id: {} });

    await ensureResultDurationColumn();

    expect(mockAddColumn).toHaveBeenCalledWith(
      'test_results',
      'durationSeconds',
      {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    );
  });

  test('keeps an existing duration column unchanged', async () => {
    await ensureResultDurationColumn();

    expect(mockAddColumn).not.toHaveBeenCalled();
  });
});
