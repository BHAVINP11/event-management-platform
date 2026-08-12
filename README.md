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
- `src/features/` - Feature-oriented areas such as auth, organizations, and events
- `src/pages/` - Route-driven pages for public, marketing, and dashboard views
- `src/services/` - Integration layers and service wrappers
- `src/hooks/` - Reusable React hooks
- `src/lib/` - Shared logic, helpers, and utilities
- `src/utils/` - Utility functions and small helpers
- `src/config/` - App configuration and environment constants
- `src/types/` - Shared TypeScript types and interfaces
- `src/styles/` - Global styling and CSS resources

## Current Development Phase

This repository is currently in the foundation phase. It includes:

- Vite + React + TypeScript setup
- Strict TypeScript and path aliasing
- ESLint and Prettier configuration
- A minimal application shell and route structure
- Placeholder routes for `/`, `/login`, `/signup`, `/dashboard`, `/events`, and `/events/:eventId`
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
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run format`
