require('dotenv').config();


module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/crm-system',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.hostinger.com',
    SMTP_PORT: process.env.SMTP_PORT || 587,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    // Twilio Configuration
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || 'AC2e749f3b25fc86afa0dd6937206d95ec',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '8045c869d4d253215e05ceeacea69e0b',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '+14433206038',
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
    // Telegram Bot Configuration
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
    COMPANY_NAME: process.env.COMPANY_NAME || 'CRM System'
  };