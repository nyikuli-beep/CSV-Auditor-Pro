export interface DocSection {
  title: string;
  paragraphs: string[];
}

export interface FooterDoc {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: DocSection[];
}

export const FOOTER_DOCS: Record<string, FooterDoc> = {
  privacy: {
    title: "Privacy Policy",
    subtitle: "Absolute data custody is our foundational promise. We process, but we never store, unless you tell us to.",
    lastUpdated: "Last updated: July 10, 2026",
    sections: [
      {
        title: "1. 100% Local Sandboxed Processing",
        paragraphs: [
          "Our primary operational architecture runs entirely inside your client-side browser context. When you upload a CSV file, the data is parsed, mapped, and audited using client-side Web Workers and local state engines.",
          "Your rows are never transmitted to our cloud servers for storage, analysis, or caching. Any external processing (such as Gemini-powered anomaly explanation) is performed via encrypted one-shot HTTPS payloads, which are immediately discarded following the API response."
        ]
      },
      {
        title: "2. Transient Client Memory & Storage Cache",
        paragraphs: [
          "Any spreadsheets loaded into the system are temporarily stored in your browser's private state or secure IndexedDB caching layer. This allows you to close and return to the application without losing your progress.",
          "You can instantly purge all stored files, diagnostic histories, and cached reports by clicking 'Clear Workspace Storage' in the Settings panel at any time."
        ]
      },
      {
        title: "3. Compliance-Grade Encryption Protocols",
        paragraphs: [
          "All outbound transactions, including Firebase-authenticated sessions, sync calls, and AI logic requests, are encrypted in-transit using industry-standard TLS 1.3 encryption.",
          "We regularly audit our network routing matrices to ensure zero leakages of analytical artifacts or private company schemas."
        ]
      }
    ]
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Operational frameworks, liability thresholds, and guidelines for spreadsheet auditing.",
    lastUpdated: "Last updated: July 10, 2026",
    sections: [
      {
        title: "1. Scope of Service & Permitted Use",
        paragraphs: [
          "CSV Auditor Pro grants you a non-exclusive, revocable license to utilize our browser-based suite for parsing, cleansing, validating, and auditing CSV/Excel datasets.",
          "The free tier is intended for individual analytical use. Commercial volume automated audits are governed strictly by our Pro and Enterprise tiers."
        ]
      },
      {
        title: "2. Data Responsibility & Liability",
        paragraphs: [
          "While our rule-engines and AI validators achieve over 99% accuracy in spotting anomalies, you assume full responsibility for the final verification of any cleaned datasets before importing them into downstream production databases, payroll systems, or external reporting tools.",
          "CSV Auditor Pro shall not be liable for financial errors, billing discrepancies, or compliance penalties resulting from unverified data corrections."
        ]
      },
      {
        title: "3. Account Conduct & API Rate Limits",
        paragraphs: [
          "Pro and Enterprise accounts are subject to fair-use API quotas for our integrated Gemini explanation services. Any attempt to reverse-engineer our proprietary scoring heuristics or spam the system endpoints will result in immediate suspension."
        ]
      }
    ]
  },
  compliance: {
    title: "GDPR & HIPAA Compliance",
    subtitle: "Built from the ground up to respect global data sovereignty and patient confidentiality standards.",
    lastUpdated: "Last updated: July 10, 2026",
    sections: [
      {
        title: "1. General Data Protection Regulation (GDPR)",
        paragraphs: [
          "Under the GDPR, CSV Auditor Pro acts as a data processor. Since our system process files inside your browser Sandbox, no personal data (PII) is transferred outside the European Economic Area (EEA).",
          "You maintain full 'Right to be Forgotten' authority over your workspace; clearing your browser local storage completely deletes all database references instantly."
        ]
      },
      {
        title: "2. Health Insurance Portability and Accountability Act (HIPAA)",
        paragraphs: [
          "We offer direct Business Associate Agreements (BAAs) for our Enterprise tier subscribers.",
          "Our zero-retention client-side sandbox ensures that Protected Health Information (PHI) inside your clinical spreadsheets is never persisted on unauthorized cloud servers. All audit sessions conform strictly to administrative, physical, and technical HIPAA safeguards."
        ]
      }
    ]
  },
  security: {
    title: "Security Overview",
    subtitle: "A detailed report on our security-first codebase, sandbox architecture, and threat mitigation vectors.",
    lastUpdated: "Last updated: July 10, 2026",
    sections: [
      {
        title: "1. Client Isolation & Container Security",
        paragraphs: [
          "Every user session is isolated inside a secure iframe running with restricted sandbox permissions. This shields the host environment from malicious macro-enabled sheets or custom injection payloads.",
          "Our backend microservices are deployed inside hardened Google Cloud Run containers that undergo automated weekly vulnerability scans."
        ]
      },
      {
        title: "2. Multi-Factor Authentication",
        paragraphs: [
          "All team logins are secured using standard Firebase Auth supporting multi-factor authentication (MFA), secure OAuth 2.0 prompts, and automated session expiry bounds."
        ]
      },
      {
        title: "3. Vulnerability Disclosure",
        paragraphs: [
          "We run active bug bounty programs to guarantee code resilience. If you detect any potential vulnerability in our file parser or rule evaluation engine, please contact security@csvauditor.com."
        ]
      }
    ]
  },
  api: {
    title: "Developer API Documentation",
    subtitle: "Integrate our high-throughput automated CSV validator into your CI/CD pipelines and ingestion queues.",
    lastUpdated: "Last updated: July 10, 2026",
    sections: [
      {
        title: "1. Authenticate Request",
        paragraphs: [
          "Generate your bearer API keys in the developer tab. All API calls must include your key in the authorization header:",
          "Authorization: Bearer csv_live_sec_xxxxxxxxxxxxxxxxxxxx"
        ]
      },
      {
        title: "2. Post Spreadsheet for Audit",
        paragraphs: [
          "Endpoint: POST /api/v1/audit",
          "Send a multipart form-data payload containing the CSV file. The response returns a detailed JSON list of structural and numerical findings:",
          "{\n  \"status\": \"completed\",\n  \"score\": 88,\n  \"findings\": [\n    { \"row\": 42, \"col\": \"Amount\", \"issue\": \"outlier\", \"description\": \"Out of standard deviation threshold.\" }\n  ]\n}"
        ]
      }
    ]
  },
  integrations: {
    title: "Integrations Ecosystem",
    subtitle: "Automate your spreadsheet pipeline by connecting CSV Auditor Pro with the services your company depends on.",
    lastUpdated: "Last updated: July 10, 2026",
    sections: [
      {
        title: "1. Cloud Storage Sync (Google Drive, Dropbox, OneDrive)",
        paragraphs: [
          "Enable automatic ingestion. Whenever a raw CSV is placed inside a watched folder, CSV Auditor runs a silent compliance audit and drops the cleaned version in your '_completed' folder automatically."
        ]
      },
      {
        title: "2. Enterprise Alerts (Slack & Microsoft Teams)",
        paragraphs: [
          "Receive real-time visual alerts if a newly audited file scores below your corporate quality threshold (e.g. 75%). Get direct slack pings containing the anomaly counts and high-priority issue descriptions."
        ]
      },
      {
        title: "3. Direct Data Warehouses (Snowflake, BigQuery, PostgreSQL)",
        paragraphs: [
          "Eliminate pipeline failures. Route cleansed CSV outputs directly to database tables. The auditor acts as an inline firewall, guaranteeing that schema violations never break downstream analytics tables."
        ]
      }
    ]
  }
};
