const role = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Требуется авторизация.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Недостаточно прав для выполнения этого действия.',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

module.exports = role;