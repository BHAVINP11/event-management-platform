# Firebase Architecture

## 1. Why Firebase is being used

Firebase provides hosted infrastructure for Authentication, Cloud Firestore, and Storage. It allows the platform to scale quickly without introducing server-side infrastructure during the early product phases.

## 2. Firebase services planned

- Firebase Authentication
- Cloud Firestore
- Firebase Storage

## 3. Infrastructure boundary

The architecture is intentionally layered:

- UI / Pages
- Features / Application Logic
- Services / Repositories
- Firebase Infrastructure
- Firebase Auth / Firestore / Storage

Firebase-specific code is contained within `src/services/firebase` and configuration is isolated in `src/config/env.ts`.

## 4. Environment configuration

Firebase configuration is loaded through Vite environment variables.

The app reads these variables from `import.meta.env` in a centralized module: `src/config/env.ts`.

## 5. Domain vs infrastructure separation

Domain types in `src/types` do not import Firebase packages.

The domain layer remains independent of Firebase, so model changes can be mapped to other storage or backend systems later.

## 6. Future authentication architecture

The app will use Firebase Authentication for user identity, but the actual login/signup flows are not implemented yet.

A future auth layer will depend on `src/services/firebase/auth.ts` without leaking Firebase types into the domain models.

## 7. Future Firestore architecture

Firestore initialization is isolated in `src/services/firebase/firestore.ts`.

Data mapping between Firestore documents and domain models will be implemented later via repository or mapper layers.

## 8. Why Firebase-specific types are not used in domain models

Domain models use plain TypeScript types and `string` timestamps to stay infrastructure-agnostic.

Using Firebase-specific types such as `Timestamp` would couple the business model to Firestore and make the domain layer harder to test and reuse.
