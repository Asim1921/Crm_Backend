const mongoose = require('mongoose');

const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.error('Database not connected. ReadyState:', mongoose.connection.readyState);
    return res.status(503).json({ 
      message: 'Database connection unavailable',
      code: 'DB_CONNECTION_ERROR'
    });
  }
  next();
};

module.exports = { checkDBConnection };
