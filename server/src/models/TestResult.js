const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestResult = sequelize.define('TestResult', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  testId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tests',
      key: 'id'
    }
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  answers: {
    type: DataTypes.JSON,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'test_results',
  timestamps: false
});

module.exports = TestResult;