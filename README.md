# Event Management Platform

Event Management Platform is a production-ready foundation for a multi-tenant SaaS application that helps event planners and couples manage events from a single platform.

## Target Users

- **Event planners / event management companies**
  - Create an organization or business profile
  - Manage multiple events
  - Invite team members to collaborate
  - Invite clients or families into individual events

- **Individual couples / families**
  - Create and manage their own event
  - Typically manage a single event
  - Invite family members
  - Invite an event planner to collaborate on their event

## High-Level Architecture

- `src/app/` - App entrypoint, React router, and providers
- `src/components/` - Shared UI patterns, layout, and reusable components
- `src/features/` - Feature-oriented areas such as auth, organizations, onboarding, and events
- `src/pages/` - Route-driven pages for public, marketing, onboarding, and dashboard views
- `src/services/` - Integration layers and service wrappers
- `src/hooks/` - Reusable React hooks
- `src/lib/` - Shared logic, helpers, and utilities
- `src/utils/` - Utility functions and small helpers
- `src/config/` - App configuration and environment constants
- `src/types/` - Shared TypeScript types and interfaces
- `src/styles/` - Global styling and CSS resources
- `functions/src/` - Cloud Functions for trusted backend operations (organization and event creation)

## Current Development Phase

This repository is currently in the foundation and onboarding phase. It includes:

- Vite + React + TypeScript setup
- Strict TypeScript and path aliasing
- ESLint and Prettier configuration
- A minimal application shell and route structure
- Firebase authentication with user profiles
- Firestore data persistence with security rules
- Trusted Cloud Functions backend (Firebase)
- Onboarding flows for event planners and individual event owners
- Placeholder routes for `/`, `/login`, `/signup`, `/onboarding`, `/dashboard`, `/events`, and `/events/:eventId`
- A Not Found page

## Technology Stack

- React
- Vite
- TypeScript
- React Router
- ESLint
- Prettier

## Development Commands

- `npm install`
- `npm run dev` - Start Vite dev server
- `npm run build` - Build the application
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Check Prettier formatting
- `npm run test:rules` - Test Firestore security rules
- `firebase emulators:start` - Start Firebase emulators (Auth, Firestore, Functions)

## Local Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill in the required Firebase keys:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Do not commit `.env`.

### Cloud Functions Setup

The Cloud Functions for onboarding are located in the `functions/` directory.

1. Install Cloud Functions dependencies:
   ```bash
   cd functions
   npm install
   ```

2. Build the Cloud Functions:
   ```bash
   npm run build
   ```

3. Run the emulators:
   ```bash
   firebase emulators:start
   ```

The Functions emulator will run on `http://localhost:5001`.

For more information, see `docs/firebase-setup.md`, `docs/firebase-architecture.md`, `docs/authentication.md`, and `docs/onboarding.md`.
