jest.mock('../src/models', () => ({
  SystemSetting: {
    findOrCreate: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    upsert: jest.fn()
  }
}));

const { SystemSetting } = require('../src/models');
const {
  DEFAULT_SETTINGS,
  ensureDefaultSettings,
  getSettings,
  getSettingValue,
  updateSettings
} = require('../src/services/systemSettings');

const storedSettings = [
  {
    key: 'platformName',
    value: 'Учебная платформа',
    description: DEFAULT_SETTINGS.platformName.description,
    updatedBy: 5,
    updatedAt: new Date('2026-01-02T03:04:05.000Z')
  },
  {
    key: 'publicRegistrationEnabled',
    value: false,
    description: DEFAULT_SETTINGS.publicRegistrationEnabled.description,
    updatedBy: 5,
    updatedAt: new Date('2026-01-02T03:04:05.000Z')
  }
];

describe('system settings service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SystemSetting.findOrCreate.mockResolvedValue([{}, false]);
    SystemSetting.findAll.mockResolvedValue(storedSettings);
    SystemSetting.findByPk.mockResolvedValue(null);
    SystemSetting.upsert.mockResolvedValue([{}, true]);
  });

  test('ensures default settings exist', async () => {
    await ensureDefaultSettings();

    expect(SystemSetting.findOrCreate).toHaveBeenCalledTimes(3);
    expect(SystemSetting.findOrCreate).toHaveBeenCalledWith({
      where: { key: 'platformName' },
      defaults: {
        key: 'platformName',
        value: DEFAULT_SETTINGS.platformName.value,
        description: DEFAULT_SETTINGS.platformName.description
      }
    });
    expect(SystemSetting.findOrCreate).toHaveBeenCalledWith({
      where: { key: 'publicRegistrationEnabled' },
      defaults: {
        key: 'publicRegistrationEnabled',
        value: DEFAULT_SETTINGS.publicRegistrationEnabled.value,
        description: DEFAULT_SETTINGS.publicRegistrationEnabled.description
      }
    });
    expect(SystemSetting.findOrCreate).toHaveBeenCalledWith({
      where: { key: 'teacherTestsRequireModeration' },
      defaults: {
        key: 'teacherTestsRequireModeration',
        value: DEFAULT_SETTINGS.teacherTestsRequireModeration.value,
        description: DEFAULT_SETTINGS.teacherTestsRequireModeration.description
      }
    });
  });

  test('returns serialized settings ordered by key', async () => {
    await expect(getSettings()).resolves.toEqual([
      {
        key: 'platformName',
        value: 'Учебная платформа',
        description: DEFAULT_SETTINGS.platformName.description,
        updatedBy: 5,
        updatedAt: storedSettings[0].updatedAt
      },
      {
        key: 'publicRegistrationEnabled',
        value: false,
        description: DEFAULT_SETTINGS.publicRegistrationEnabled.description,
        updatedBy: 5,
        updatedAt: storedSettings[1].updatedAt
      }
    ]);

    expect(SystemSetting.findAll).toHaveBeenCalledWith({
      order: [['key', 'ASC']]
    });
  });

  test('returns stored and default setting values', async () => {
    SystemSetting.findByPk.mockResolvedValueOnce({ value: 'Stored name' });
    await expect(getSettingValue('platformName')).resolves.toBe('Stored name');

    SystemSetting.findByPk.mockResolvedValueOnce(null);
    await expect(getSettingValue('publicRegistrationEnabled')).resolves.toBe(true);

    SystemSetting.findByPk.mockResolvedValueOnce(null);
    await expect(getSettingValue('unknownSetting')).resolves.toBeUndefined();
  });

  test('updates known settings with normalized values and ignores unknown keys', async () => {
    await updateSettings({
      platformName: `  ${'A'.repeat(120)}  `,
      publicRegistrationEnabled: 0,
      teacherTestsRequireModeration: 'yes',
      unknownSetting: 'ignored'
    }, 42);

    expect(SystemSetting.upsert).toHaveBeenCalledTimes(3);
    expect(SystemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      key: 'platformName',
      value: 'A'.repeat(100),
      description: DEFAULT_SETTINGS.platformName.description,
      updatedBy: 42,
      updatedAt: expect.any(Date)
    }));
    expect(SystemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      key: 'publicRegistrationEnabled',
      value: false,
      description: DEFAULT_SETTINGS.publicRegistrationEnabled.description,
      updatedBy: 42,
      updatedAt: expect.any(Date)
    }));
    expect(SystemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      key: 'teacherTestsRequireModeration',
      value: true,
      description: DEFAULT_SETTINGS.teacherTestsRequireModeration.description,
      updatedBy: 42,
      updatedAt: expect.any(Date)
    }));
    expect(SystemSetting.upsert).not.toHaveBeenCalledWith(expect.objectContaining({
      key: 'unknownSetting'
    }));
    expect(SystemSetting.findAll).toHaveBeenCalledWith({
      order: [['key', 'ASC']]
    });
  });

  test('falls back to default platform name when a blank name is saved', async () => {
    await updateSettings({ platformName: '' }, 7);

    expect(SystemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      key: 'platformName',
      value: DEFAULT_SETTINGS.platformName.value,
      updatedBy: 7
    }));
  });
});
