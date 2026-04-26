const User = require('./User');
const Test = require('./Test');
const Question = require('./Question');
const TestResult = require('./TestResult');

Test.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
User.hasMany(Test, { foreignKey: 'authorId' });

Question.belongsTo(Test, { foreignKey: 'testId', as: 'test' });
Test.hasMany(Question, { foreignKey: 'testId' });

TestResult.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(TestResult, { foreignKey: 'userId' });

TestResult.belongsTo(Test, { foreignKey: 'testId', as: 'test' });
Test.hasMany(TestResult, { foreignKey: 'testId' });

module.exports = {
  sequelize: require('../config/database').sequelize,
  User,
  Test,
  Question,
  TestResult
};
