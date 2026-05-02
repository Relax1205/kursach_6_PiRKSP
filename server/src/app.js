const express = require('express');
const cors = require('cors');
const { DataTypes } = require('sequelize');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const resultRoutes = require('./routes/results');
const adminRoutes = require('./routes/admin');
const { setupSwagger } = require('./config/swagger');
const { ensureDefaultSettings } = require('./services/systemSettings');

const app = express();
const PORT = process.env.PORT || 5000;

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

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

setupSwagger(app);

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
  }

  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    await ensureResultDurationColumn();
    await ensureDefaultSettings();
    console.log('Database synchronized');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
