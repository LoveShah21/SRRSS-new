const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const explicitTls = process.env.MONGODB_TLS;
    const shouldUseTls = explicitTls != null
      ? explicitTls === 'true'
      : process.env.NODE_ENV === 'production';

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'srrss',
      tls: shouldUseTls,
      // Connection pooling
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
