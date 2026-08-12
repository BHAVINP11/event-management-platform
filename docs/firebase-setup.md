# Firebase Setup

This document describes the local setup required to connect the application to Firebase.

## 1. Create a Firebase project

1. Visit https://console.firebase.google.com/
2. Create a new Firebase project for your environment.

## 2. Register a web application

1. In the Firebase console, open your project.
2. Add a new Web app and note the Firebase configuration values.

## 3. Obtain Firebase web configuration

Firebase will provide a config object containing:
- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## 4. Add values to local environment variables

Create a local `.env` file at the project root with the following values:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Do not commit `.env` files.

## 5. Enable Firestore

Enable Cloud Firestore in the Firebase console. You can start in test mode for local development, but do not use overly permissive rules in production.

## 6. Enable Authentication later

Authentication is not implemented yet, but when ready, enable Firebase Authentication in the console and configure the desired providers.

## 7. Configure Storage later

When file uploads are needed, enable Firebase Storage in the console and add appropriate storage rules.
