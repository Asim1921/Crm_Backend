const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { checkDBConnection } = require('./middleware/dbHealthMiddleware');
require('dotenv').config();

const app = express();

// Trust proxy for rate limiting behind load balancer/proxy
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security middleware

const allowedOrigins = [
  'https://crmama.com.mx',
  'https://www.crmama.com.mx',
'http://localhost:5173'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting disabled for development - remove in production if needed
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // limit each IP to 1000 requests per windowMs
//   message: {
//     error: 'Too many requests from this IP, please try again later.',
//     retryAfter: Math.ceil(15 * 60 / 60)
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (req, res) => {
//     res.status(429).json({
//       error: 'Too many requests from this IP, please try again later.',
//       retryAfter: Math.ceil(15 * 60 / 60)
//     });
//   }
// });

// Rate limiting disabled - apply only if needed in production
// app.use((req, res, next) => {
//   if (req.path === '/api/health') {
//     return next();
//   }
//   limiter(req, res, next);
// });

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database health check middleware for all API routes
app.use('/api', checkDBConnection);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/communications', require('./routes/communicationRoutes'));
app.use('/api/twilio', require('./routes/twilioRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState
    }
  });
});

// Error handling middleware
app.use(require('./middleware/errorMiddleware'));

const PORT = process.env.PORT || 5000;

app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
});
