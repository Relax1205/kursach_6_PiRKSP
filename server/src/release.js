require('dotenv').config();

const { DataTypes } = require('sequelize');
const { sequelize, testConnection } = require('./config/database');
const { ensureDefaultSettings } = require('./services/systemSettings');

const ensureResultDurationColumn = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableDescription = await queryInterface.describeTable('test_results');

  if (!tableDescription.durationSeconds) {
    await queryInterface.addColumn('test_results', 'durationSeconds', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  }
};

const runRelease = async () => {
  await testConnection();
  await sequelize.sync();
  await ensureResultDurationColumn();
  await ensureDefaultSettings();
  console.log('Release tasks completed');
};

if (require.main === module) {
  runRelease()
    .catch((error) => {
      console.error('Release tasks failed:', error);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = {
  ensureResultDurationColumn,
  runRelease
};
