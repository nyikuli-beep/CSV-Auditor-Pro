# Authentication & Identity

## Authentication System
CSV Auditor Pro uses Firebase Authentication for secure identity management:

- **Google OAuth Sign-In**: One-click authentication using Google Workspace accounts.
- **Email & Password**: Standard credential authentication with password strength validation and email verification.
- **Session Tokens**: Authenticated sessions issue Firebase JWT Bearer tokens that are verified server-side on protected API routes via `firebase-admin`.
- **Gmail Authorization**: Optional secondary Google OAuth popup flow granting `https://www.googleapis.com/auth/gmail.send` and `gmail.readonly` scopes for inbox search and report dispatching.
