const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  testId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tests',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('single', 'multiple', 'matching'),
    defaultValue: 'single'
  },
  questionText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true
  },
  left: {
    type: DataTypes.JSON,
    allowNull: true
  },
  right: {
    type: DataTypes.JSON,
    allowNull: true
  },
  correct: {
    type: DataTypes.JSON,
    allowNull: false
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'questions',
  timestamps: false
});

module.exports = Question;