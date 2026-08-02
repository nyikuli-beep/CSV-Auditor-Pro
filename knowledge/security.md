# Security & Data Privacy

## Data Governance & Privacy Principles
- **No Third-Party AI Data Retention**: All Gemini AI interactions use official Google Enterprise API endpoints where customer data is not stored or utilized for base model retraining.
- **Client-Side First Processing**: Primary file parsing, row scanning, and cell modifications execute inside your local browser memory space.
- **Role-Based Access Control (RBAC)**: Workspaces enforce fine-grained permissions:
  - **Owner**: Full workspace administration, member deletion, billing, and API key management.
  - **Admin**: Full audit, cleaning, schema management, and team invitations.
  - **Editor**: Upload files, run cleaning routines, add cell annotations, export data.
  - **Viewer**: Read-only access to audit reports, dataset summaries, and annotations.
- **Encrypted Transmission**: All network traffic uses TLS 1.3/HTTPS encryption with Bearer token authentication via Firebase Auth ID tokens.
- **Google Workspace OAuth Protection**: Gmail integration requires explicit user authorization via Google OAuth consent flows, requesting only necessary email dispatch scopes (`gmail.send`, `gmail.readonly`).
