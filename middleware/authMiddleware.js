const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const config = require('../config/env');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          message: 'Not authorized, no token provided',
          code: 'NO_TOKEN'
        });
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({ 
          message: 'Invalid token format',
          code: 'INVALID_TOKEN'
        });
      }

      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      req.user = user;
      console.log('Auth middleware: User authenticated successfully:', { id: user._id, email: user.email, role: user.role, extension: user.extension });
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      } else {
        return res.status(500).json({ 
          message: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    }
  } else {
    return res.status(401).json({ 
      message: 'Not authorized, no token provided',
      code: 'NO_TOKEN'
    });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

const agent = (req, res, next) => {
  if (req.user && (req.user.role === 'agent' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as agent' });
  }
};

const teamLead = (req, res, next) => {
  if (req.user && (req.user.role === 'tl' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as team lead' });
  }
};

const agentOrTeamLead = (req, res, next) => {
  if (req.user && (req.user.role === 'agent' || req.user.role === 'tl' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as agent or team lead' });
  }
};

module.exports = { protect, admin, agent, teamLead, agentOrTeamLead };
