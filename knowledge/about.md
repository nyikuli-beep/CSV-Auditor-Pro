# About CSV Auditor Pro

## Product Overview
CSV Auditor Pro is an enterprise-grade spreadsheet compliance, data cleaning, and dataset audit platform. It provides automated anomaly detection, schema validation, real-time data transformation, and team collaboration for CSV, TSV, and Excel files.

## Mission
To eliminate corrupted spreadsheets, broken database migrations, duplicate transaction records, and dirty data before it enters production databases or business intelligence pipelines.

## Architectural Highlights
- **Client-Side Data Privacy**: Core CSV parsing, previewing, and initial data validation run locally in the browser. Spreadsheet data is never permanently stored on external servers without explicit user save actions.
- **Server-Side AI Intelligence**: Advanced AI reasoning, anomaly explanation, and conversational auditing are powered by Google Gemini (e.g., `gemini-3.6-flash` and `gemini-3.1-pro-preview`) via secure backend API proxies (`/api/gemini/chat`).
- **Hybrid Storage & Persistence**: Integrates Firebase Firestore for real-time collaboration, team permissions, cell annotations, and audit history, with optional PostgreSQL (Cloud SQL / Drizzle ORM) for full-stack enterprise data sync.
- **Compliance Gateway & Gmail Integration**: Seamless dispatch of audit reports, compliance summaries, and anomaly flags directly to stakeholder inboxes via Google Workspace Gmail OAuth or the internal Compliance Email Gateway.
