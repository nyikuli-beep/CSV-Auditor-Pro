import { CSVFile, TeamMember, AuditActivity, AuditIssue } from './types';

// Messy transaction sample rows
export const MESSY_ROWS: Record<string, string>[] = [
  { Transaction_ID: 'TXN-1001', Date: '2026-06-01', Customer_Name: 'Acme Corp', Amount: '1250.00', Category: 'Software', Country: 'United States', Contact_Info: '+1 (555) 019-2834 / sales@acme.com' },
  { Transaction_ID: 'TXN-1002', Date: '2026-06-02', Customer_Name: 'Global Industries', Amount: '4500.50', Category: 'Hardware', Country: 'United Kingdom', Contact_Info: 'support@global.com' },
  { Transaction_ID: 'TXN-1001', Date: '2026-06-01', Customer_Name: 'Acme Corp', Amount: '1250.00', Category: 'Software', Country: 'United States', Contact_Info: '+1 (555) 019-2834' }, // Duplicate
  { Transaction_ID: 'TXN-1003', Date: '2026-06-03', Customer_Name: 'Nesta Labs', Amount: '', Category: 'Consulting', Country: 'Canada', Contact_Info: 'info@nesta.ca or 416-555-0199' }, // Missing Amount
  { Transaction_ID: 'TXN-1004', Date: '04/06/2026', Customer_Name: 'Hooli Inc', Amount: '350.00', Category: 'SaaS', Country: 'United States', Contact_Info: 'gavin@hooli.com' }, // Inconsistent date format
  { Transaction_ID: 'TXN-1005', Date: '2026-06-05', Customer_Name: 'Zenith Retail', Amount: '240.00', Category: 'software', Country: 'us', Contact_Info: '555-0122' }, // Case issues
  { Transaction_ID: 'TXN-1006', Date: '2026-06-08', Customer_Name: 'Initech SA', Amount: '1500000.00', Category: 'Acquisition', Country: 'Germany', Contact_Info: 'lumberg@initech.com' }, // Outlier amount
  { Transaction_ID: 'TXN-1007', Date: '2026-06-09', Customer_Name: 'E-Corp Ltd', Amount: '890.00', Category: '', Country: 'France', Contact_Info: 'contact@ecorp.net' }, // Missing category
  { Transaction_ID: 'TXN-1008', Date: '2026-06-10', Customer_Name: 'Tyrell Nexus', Amount: '-150.00', Category: 'Refund', Country: 'Japan', Contact_Info: 'rachel@tyrell.jp' }, // Negative amount check (Warning/Info)
  { Transaction_ID: 'TXN-1009', Date: '2026-06-11', Customer_Name: 'Stark Enterprises', Amount: '45000.00', Category: 'Security', Country: 'United States', Contact_Info: 'tony@stark.com / +1 (800) 555-0100' },
  { Transaction_ID: 'TXN-1010', Date: '2026-06-12', Customer_Name: 'Wayne Corp', Amount: '12500.00', Category: 'Security', Country: 'United States', Contact_Info: 'bruce@wayne.tech' },
];

export const MESSY_ISSUES: AuditIssue[] = [
  {
    id: 'issue-1',
    type: 'duplicate',
    column: 'Transaction_ID',
    row: 3,
    value: 'TXN-1001',
    severity: 'critical',
    description: 'Duplicate record found. Entire row matches Row 1.',
    suggestion: 'Remove duplicate record.',
    status: 'open'
  },
  {
    id: 'issue-2',
    type: 'missing_value',
    column: 'Amount',
    row: 4,
    value: '',
    severity: 'critical',
    description: 'Missing numerical value in crucial financial column.',
    suggestion: 'Impute missing value using column average or median, or fill with 0.',
    status: 'open'
  },
  {
    id: 'issue-3',
    type: 'invalid_format',
    column: 'Date',
    row: 5,
    value: '04/06/2026',
    severity: 'warning',
    description: 'Date format does not match ISO-8601 standard (YYYY-MM-DD).',
    suggestion: 'Standardize format to YYYY-MM-DD (e.g., 2026-06-04).',
    status: 'open'
  },
  {
    id: 'issue-4',
    type: 'column_inconsistency',
    column: 'Country',
    row: 6,
    value: 'us',
    severity: 'warning',
    description: 'Lowercase state/country code used instead of standardized naming.',
    suggestion: 'Apply standardization to match "United States" or two-letter uppercase "US".',
    status: 'open'
  },
  {
    id: 'issue-5',
    type: 'column_inconsistency',
    column: 'Category',
    row: 6,
    value: 'software',
    severity: 'info',
    description: 'Inconsistent capitalization for category. Expected capitalized text.',
    suggestion: 'Convert category to Sentence Case ("Software").',
    status: 'open'
  },
  {
    id: 'issue-6',
    type: 'outlier',
    column: 'Amount',
    row: 7,
    value: '1500000.00',
    severity: 'warning',
    description: 'Extreme statistical outlier detected (Z-score > 3.0). Amount is 400x the median.',
    suggestion: 'Manually review transaction to verify correctness before approving.',
    status: 'open'
  },
  {
    id: 'issue-7',
    type: 'missing_value',
    column: 'Category',
    row: 8,
    value: '',
    severity: 'warning',
    description: 'Empty category value which affects classification filters.',
    suggestion: 'Fill with standard category (e.g., "Uncategorized").',
    status: 'open'
  }
];

export const SAMPLE_MESSY_FILE: CSVFile = {
  id: 'file-active',
  name: 'Company_Q2_Transactions_Messy.csv',
  size: 2450,
  uploadedAt: '2026-06-23 10:15 AM',
  status: 'completed',
  score: 68,
  headers: ['Transaction_ID', 'Date', 'Customer_Name', 'Amount', 'Category', 'Country', 'Contact_Info'],
  rows: MESSY_ROWS,
  issues: MESSY_ISSUES,
};

export const PREVIOUS_AUDITS: CSVFile[] = [
  {
    id: 'file-1',
    name: 'Payroll_May_2026_Standardized.csv',
    size: 45120,
    uploadedAt: '2026-05-30 04:32 PM',
    status: 'completed',
    score: 98,
    headers: ['Employee_ID', 'Name', 'Gross_Pay', 'Tax_Deducted', 'Net_Pay', 'Department'],
    rows: [],
    issues: [
      {
        id: 'file-1-issue-1',
        type: 'outlier',
        column: 'Gross_Pay',
        row: 45,
        value: '18500.00',
        severity: 'info',
        description: 'Monthly payroll outlier flagged.',
        suggestion: 'No action required, executive salary verified.',
        status: 'resolved'
      }
    ]
  },
  {
    id: 'file-2',
    name: 'NGO_Donor_Report_Unclean.csv',
    size: 18240,
    uploadedAt: '2026-06-15 09:12 AM',
    status: 'completed',
    score: 75,
    headers: ['Donor_ID', 'First_Name', 'Last_Name', 'Email', 'Contribution', 'Designation'],
    rows: [],
    issues: []
  },
  {
    id: 'file-3',
    name: 'Inventory_Audit_Raw.csv',
    size: 110450,
    uploadedAt: '2026-06-21 11:45 AM',
    status: 'failed',
    score: 0,
    headers: [],
    rows: [],
    issues: []
  }
];

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'usr-1', name: 'Sarah Jenkins', email: 'sarah@company.com', role: 'Owner', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', status: 'active' },
  { id: 'usr-2', name: 'Marcus Vance', email: 'marcus@company.com', role: 'Admin', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', status: 'active' },
  { id: 'usr-3', name: 'Leila Chen', email: 'leila.c@company.com', role: 'Editor', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face', status: 'active' },
  { id: 'usr-4', name: 'David Kim', email: 'd.kim@company.com', role: 'Viewer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', status: 'invited' },
];

export const AUDIT_ACTIVITIES: AuditActivity[] = [
  { id: 'act-1', userId: 'usr-1', userName: 'Sarah Jenkins', action: 'Uploaded a new CSV dataset for auditing', timestamp: '2026-06-23 10:15 AM', fileName: 'Company_Q2_Transactions_Messy.csv' },
  { id: 'act-2', userId: 'usr-2', userName: 'Marcus Vance', action: 'Resolved 3 invalid email formatting errors', timestamp: '2026-06-22 03:40 PM', fileName: 'NGO_Donor_Report_Unclean.csv' },
  { id: 'act-3', userId: 'usr-3', userName: 'Leila Chen', action: 'Downloaded PDF audit compliance report', timestamp: '2026-06-22 11:24 AM', fileName: 'Payroll_May_2026_Standardized.csv' },
  { id: 'act-4', userId: 'usr-1', userName: 'Sarah Jenkins', action: 'Invited David Kim to join company project workspace', timestamp: '2026-06-21 02:15 PM' },
];

export const TESTIMONIALS = [
  {
    quote: "CSV Auditor Pro saved our accounting team over 15 hours a week of manual VLOOKUP operations. The AI-generated corrections are incredibly accurate.",
    author: "Elena Rostova",
    role: "Head of Finance, DevFlow",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
  },
  {
    quote: "Our donor lists are always a complete mess. Standardizing dates and geocodes has gone from a dreaded task to a 2-minute automated audit.",
    author: "Julian Rivers",
    role: "Data Lead, Global Hope NGO",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
  },
  {
    quote: "An absolute lifesaver before ingestion into Postgres. It flags extreme outliers, missing values, and corrupted text fields that used to crash our db pipelines.",
    author: "Sanjay Mehta",
    role: "DevOps Engineer, Hooli",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face"
  }
];

export const FAQ_ITEMS = [
  {
    q: "Is my corporate data secure with CSV Auditor Pro?",
    a: "Absolutely. All processing and audits are executed server-side under full end-to-end encryption. Your uploaded CSV data is isolated to your company tenant and is never used to train global AI models."
  },
  {
    q: "How does the AI insights generator work?",
    a: "Our engine parses the schema and metadata of your spreadsheet, running statistical checks on columns. It then feeds anomaly records and distribution characteristics into Google's Gemini LLM to construct human-readable error descriptions and immediate step-by-step cleaning recommendations."
  },
  {
    q: "What file sizes do you support?",
    a: "The Free plan supports files up to 10MB. The Pro plan supports files up to 250MB, and our Enterprise tier scales up to 5GB with distributed server parsing pipelines."
  },
  {
    q: "Can I connect CSV Auditor Pro to our database pipelines?",
    a: "Yes! The Enterprise plan provides access to our developer REST API and secure webhooks to integrate data audits directly into your ingestion processes before data enters your warehouse."
  }
];
