const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes (будут добавлены)
// app.use('/api/auth', authRoutes);
// app.use('/api/tests', testRoutes);
// app.use('/api/questions', questionRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});