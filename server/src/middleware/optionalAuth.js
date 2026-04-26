const jwt = require('jsonwebtoken');
const { User } = require('../models');

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (user) {
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = optionalAuth;
