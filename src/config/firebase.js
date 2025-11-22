require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Resolve path relative to project root
      const serviceAccountPath = path.resolve(__dirname, '../../', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      serviceAccount = require(serviceAccountPath);
    } else {
      // Use individual environment variables
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
      };
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin initialized successfully');
    return admin;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

module.exports = { initializeFirebase, admin };
