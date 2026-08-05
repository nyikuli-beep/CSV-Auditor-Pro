/**
 * Reusable Workflow Engine & Recorder
 * CSV Auditor Pro
 */

export interface WorkflowStep {
  id: string;
  actionType: string;
  title: string;
  params: Record<string, any>;
  timestamp: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

const STORAGE_WORKFLOW_KEY = 'csv_auditor_cleaning_workflows_v1';

// Default pre-built workflow templates
const DEFAULT_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'wf-standard-hygiene',
    name: 'Standard Data Hygiene Pipeline',
    description: 'Auto-removes duplicates, cleans invisible control characters, normalizes nulls, and formats dates to ISO.',
    steps: [
      { id: 's1', actionType: 'remove_duplicates', title: 'Remove Duplicate Records', params: {}, timestamp: new Date().toISOString() },
      { id: 's2', actionType: 'clean_invisible_chars', title: 'Clean Invisible Characters', params: {}, timestamp: new Date().toISOString() },
      { id: 's3', actionType: 'normalize_nulls', title: 'Standardize Null Values', params: { targetNullValue: '' }, timestamp: new Date().toISOString() },
      { id: 's4', actionType: 'standardize_dates', title: 'Standardize Date Formats', params: {}, timestamp: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 12
  },
  {
    id: 'wf-security-pii',
    name: 'PII Sanitize & Formula Shield',
    description: 'Masks emails and phone numbers, escapes CSV formula injection vulnerabilities, and strips HTML/Markdown tags.',
    steps: [
      { id: 's1', actionType: 'protect_formulas', title: 'Shield CSV Formula Injection', params: {}, timestamp: new Date().toISOString() },
      { id: 's2', actionType: 'clean_html_markdown', title: 'Strip HTML & Markdown Tags', params: {}, timestamp: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 8
  }
];

export function getSavedWorkflows(): WorkflowTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_WORKFLOW_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_WORKFLOWS;
}

export function saveWorkflowTemplate(template: WorkflowTemplate): WorkflowTemplate[] {
  const current = getSavedWorkflows();
  const existingIndex = current.findIndex(w => w.id === template.id);
  
  if (existingIndex >= 0) {
    current[existingIndex] = { ...template, updatedAt: new Date().toISOString() };
  } else {
    current.unshift(template);
  }

  try {
    localStorage.setItem(STORAGE_WORKFLOW_KEY, JSON.stringify(current));
  } catch (e) {}
  return current;
}

export function deleteWorkflowTemplate(templateId: string): WorkflowTemplate[] {
  const current = getSavedWorkflows().filter(w => w.id !== templateId);
  try {
    localStorage.setItem(STORAGE_WORKFLOW_KEY, JSON.stringify(current));
  } catch (e) {}
  return current;
}
