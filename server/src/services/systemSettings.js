const { SystemSetting } = require('../models');

const DEFAULT_SETTINGS = Object.freeze({
  platformName: {
    value: 'Конструктор тестов',
    description: 'Название системы в интерфейсе'
  },
  publicRegistrationEnabled: {
    value: true,
    description: 'Разрешить самостоятельную регистрацию студентов'
  },
  teacherTestsRequireModeration: {
    value: false,
    description: 'Новые тесты преподавателей требуют модерации администратора'
  }
});

const normalizeSettingValue = (key, value) => {
  if (key === 'platformName') {
    return String(value || DEFAULT_SETTINGS.platformName.value).trim().slice(0, 100);
  }

  if (key === 'publicRegistrationEnabled' || key === 'teacherTestsRequireModeration') {
    return Boolean(value);
  }

  return value;
};

const serializeSetting = (setting) => ({
  key: setting.key,
  value: setting.value,
  description: setting.description,
  updatedBy: setting.updatedBy,
  updatedAt: setting.updatedAt
});

const ensureDefaultSettings = async () => {
  for (const [key, setting] of Object.entries(DEFAULT_SETTINGS)) {
    await SystemSetting.findOrCreate({
      where: { key },
      defaults: {
        key,
        value: setting.value,
        description: setting.description
      }
    });
  }
};

const getSettings = async () => {
  await ensureDefaultSettings();

  const settings = await SystemSetting.findAll({
    order: [['key', 'ASC']]
  });

  return settings.map(serializeSetting);
};

const getSettingValue = async (key) => {
  const setting = await SystemSetting.findByPk(key);

  if (!setting) {
    return DEFAULT_SETTINGS[key]?.value;
  }

  return setting.value;
};

const updateSettings = async (settings, userId) => {
  await ensureDefaultSettings();

  for (const [key, value] of Object.entries(settings)) {
    const normalizedValue = normalizeSettingValue(key, value);

    if (!DEFAULT_SETTINGS[key]) {
      continue;
    }

    await SystemSetting.upsert({
      key,
      value: normalizedValue,
      description: DEFAULT_SETTINGS[key].description,
      updatedBy: userId,
      updatedAt: new Date()
    });
  }

  return getSettings();
};

module.exports = {
  DEFAULT_SETTINGS,
  ensureDefaultSettings,
  getSettings,
  getSettingValue,
  updateSettings
};
