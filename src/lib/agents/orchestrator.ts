/**
 * Enterprise AI Agent Orchestrator
 * Phase 2: Central Orchestration Engine for CSV Auditor Pro
 * 
 * Coordinates multi-agent intent routing, tool execution, evidence gathering,
 * dynamic RAG retrieval, and coherent enterprise response formulation.
 */

import { 
  SpecialistAgentType, 
  MultiAgentPlan, 
  AgentEvidence, 
  MultiAgentUnifiedResponseMeta 
} from './types';
import { SPECIALIST_AGENTS } from './specialists';
import { 
  executeToolByName, 
  summarizeDataset, 
  findDuplicates, 
  detectOutliers, 
  calculateStatistics, 
  findMissingValues, 
  findInvalidCharacters, 
  detectSchemaChanges, 
  calculateCorrelation, 
  ToolResult 
} from '../aiToolRegistry';
import { StructuredCSVContext } from '../csvContextEngine';
import { retrieveKnowledgeChunks, KnowledgeChunk } from '../ragEngine';
import { detectUserIntent, classifyDetailedIntent, AIIntentCategory, FineGrainedIntentCategory } from '../intentDetectionEngine';

export interface OrchestratorRequest {
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  datasetContext?: StructuredCSVContext;
  userContext?: {
    userId?: string;
    tier?: string;
    role?: string;
    teamId?: string;
    organizationName?: string;
  };
  image?: {
    inlineData: {
      mimeType: string;
      data: string;
    };
  };
  thinkingMode?: boolean;
  enableSearchGrounding?: boolean;
  knowledgeBaseId?: string;
  explicitAgent?: SpecialistAgentType;
}

export class AgentOrchestrator {
  private toolExecutionCache: Map<string, ToolResult> = new Map();

  /**
   * 1. Plan Multi-Agent Strategy & Intent Routing
   */
  public planRouting(
    prompt: string, 
    hasDataset: boolean, 
    headers: string[] = [], 
    explicitAgent?: SpecialistAgentType
  ): MultiAgentPlan {
    // If explicitly assigned agent
    if (explicitAgent && SPECIALIST_AGENTS[explicitAgent]) {
      return {
        primaryAgent: explicitAgent,
        collaboratingAgents: [],
        isCompoundQuery: false,
        routingRationale: `Directly targeted agent: ${SPECIALIST_AGENTS[explicitAgent].name}`,
        requiredTools: SPECIALIST_AGENTS[explicitAgent].toolAffinities,
        requiresRag: explicitAgent === 'product_support_agent' || explicitAgent === 'compliance_auditor',
        intentCategory: 'CSV_ANALYSIS',
        fineCategory: 'CSV_AUDITING',
        confidence: 1.0
      };
    }

    const lower = prompt.toLowerCase();
    const intentResult = detectUserIntent(prompt, hasDataset, headers);
    const fineClassification = classifyDetailedIntent(prompt);

    // Rule 1: Product Support (Platform, Subscription, Team, Tenancy, Pricing, Quota)
    const isPlatformQuery = 
      lower.includes('how to use') || 
      lower.includes('csv auditor pro') || 
      lower.includes('pricing') || 
      lower.includes('tier') || 
      lower.includes('subscription') || 
      lower.includes('enterprise plan') || 
      lower.includes('team') || 
      lower.includes('invite') || 
      lower.includes('export pdf') || 
      lower.includes('api key') || 
      lower.includes('workspace');

    if (isPlatformQuery && (!hasDataset || (!lower.includes('this file') && !lower.includes('my column')))) {
      return {
        primaryAgent: 'product_support_agent',
        collaboratingAgents: [],
        isCompoundQuery: false,
        routingRationale: 'Query pertains to CSV Auditor Pro platform features, workspace settings, or subscription entitlements.',
        requiredTools: [],
        requiresRag: true,
        intentCategory: 'APP_EXPLANATION',
        fineCategory: 'GENERAL_PRODUCT_INFORMATION',
        confidence: 0.98
      };
    }

    // Rule 2: General Knowledge (No dataset uploaded and general question)
    if (!hasDataset && !isPlatformQuery) {
      return {
        primaryAgent: 'general_knowledge_agent',
        collaboratingAgents: [],
        isCompoundQuery: false,
        routingRationale: 'External knowledge question without an active dataset loaded.',
        requiredTools: [],
        requiresRag: false,
        intentCategory: 'GENERAL_AI',
        fineCategory: 'GENERAL_AI',
        confidence: 0.95
      };
    }

    // Rule 3: Check for Compound / Multi-Agent Questions
    // e.g., "Why are my sales decreasing and what data quality issues could be causing this?"
    const hasBusinessIntent = lower.includes('sales') || lower.includes('revenue') || lower.includes('trend') || lower.includes('business') || lower.includes('kpi') || lower.includes('executive') || lower.includes('decision');
    const hasQualityIntent = lower.includes('quality') || lower.includes('duplicate') || lower.includes('missing') || lower.includes('null') || lower.includes('blank') || lower.includes('invalid') || lower.includes('error');
    const hasStatsIntent = lower.includes('statistic') || lower.includes('outlier') || lower.includes('mean') || lower.includes('distribution') || lower.includes('correlation') || lower.includes('deviation') || lower.includes('z-score');
    const hasCleaningIntent = lower.includes('clean') || lower.includes('fix') || lower.includes('remedy') || lower.includes('standardize') || lower.includes('format') || lower.includes('normalize');
    const hasComplianceIntent = lower.includes('compliance') || lower.includes('gdpr') || lower.includes('soc2') || lower.includes('privacy') || lower.includes('pii') || lower.includes('formula') || lower.includes('security');

    // Multi-Agent Case A: Business + Quality + Stats Collaboration
    if (hasBusinessIntent && (hasQualityIntent || hasStatsIntent)) {
      const collaborating: SpecialistAgentType[] = [];
      if (hasQualityIntent) collaborating.push('data_quality_auditor');
      if (hasStatsIntent) collaborating.push('statistical_analyst');
      if (hasCleaningIntent) collaborating.push('data_cleaning_expert');

      return {
        primaryAgent: 'business_intelligence_analyst',
        collaboratingAgents: collaborating,
        isCompoundQuery: true,
        routingRationale: 'Compound business inquiry requiring multi-agent synthesis of statistical metrics and data quality forensics.',
        requiredTools: ['summarizeDataset', 'calculateStatistics', 'findDuplicates', 'detectOutliers'],
        requiresRag: false,
        intentCategory: 'MIXED_REQUEST',
        fineCategory: 'AI_ANALYSIS',
        confidence: 0.96
      };
    }

    // Multi-Agent Case B: Quality Audit + Cleaning Expert Collaboration
    if (hasQualityIntent && hasCleaningIntent) {
      return {
        primaryAgent: 'data_quality_auditor',
        collaboratingAgents: ['data_cleaning_expert'],
        isCompoundQuery: true,
        routingRationale: 'Data inspection request combined with actionable cleaning remediation requirements.',
        requiredTools: ['summarizeDataset', 'findMissingValues', 'findDuplicates'],
        requiresRag: false,
        intentCategory: 'CSV_ANALYSIS',
        fineCategory: 'DATA_CLEANING',
        confidence: 0.97
      };
    }

    // Multi-Agent Case C: Compliance + Security
    if (hasComplianceIntent) {
      const collaborating: SpecialistAgentType[] = [];
      if (hasQualityIntent) collaborating.push('data_quality_auditor');

      return {
        primaryAgent: 'compliance_auditor',
        collaboratingAgents: collaborating,
        isCompoundQuery: collaborating.length > 0,
        routingRationale: 'Governance, security, and compliance verification request.',
        requiredTools: ['findInvalidCharacters', 'summarizeDataset'],
        requiresRag: true,
        intentCategory: 'CSV_ANALYSIS',
        fineCategory: 'SECURITY_PRIVACY',
        confidence: 0.95
      };
    }

    // Single-Specialist: Statistical Analyst
    if (hasStatsIntent || lower.includes('average') || lower.includes('median') || lower.includes('std') || lower.includes('variance') || lower.includes('highest') || lower.includes('lowest')) {
      return {
        primaryAgent: 'statistical_analyst',
        collaboratingAgents: [],
        isCompoundQuery: false,
        routingRationale: 'Quantitative calculation, statistical distribution, or outlier diagnostic query.',
        requiredTools: ['calculateStatistics', 'detectOutliers', 'calculateCorrelation', 'summarizeDataset'],
        requiresRag: false,
        intentCategory: 'CSV_ANALYSIS',
        fineCategory: 'AI_ANALYSIS',
        confidence: 0.98
      };
    }

    // Single-Specialist: Data Cleaning Expert
    if (hasCleaningIntent || lower.includes('remove') || lower.includes('trim') || lower.includes('casing') || lower.includes('standard')) {
      return {
        primaryAgent: 'data_cleaning_expert',
        collaboratingAgents: [],
        isCompoundQuery: false,
        routingRationale: 'Data standardization, transformation, or hygiene request.',
        requiredTools: ['summarizeDataset', 'findMissingValues'],
        requiresRag: false,
        intentCategory: 'CSV_ANALYSIS',
        fineCategory: 'DATA_CLEANING',
        confidence: 0.97
      };
    }

    // Single-Specialist: Business Intelligence Analyst
    if (hasBusinessIntent || lower.includes('summary') || lower.includes('brief') || lower.includes('report') || lower.includes('overview')) {
      return {
        primaryAgent: 'business_intelligence_analyst',
        collaboratingAgents: [],
        isCompoundQuery: false,
        routingRationale: 'Executive briefing or high-level dataset synthesis request.',
        requiredTools: ['summarizeDataset', 'calculateStatistics'],
        requiresRag: false,
        intentCategory: 'CSV_ANALYSIS',
        fineCategory: 'CSV_AUDITING',
        confidence: 0.96
      };
    }

    // Default Fallback: Data Quality Auditor
    return {
      primaryAgent: 'data_quality_auditor',
      collaboratingAgents: [],
      isCompoundQuery: false,
      routingRationale: 'General dataset inspection and quality audit.',
      requiredTools: ['summarizeDataset', 'findMissingValues', 'findDuplicates'],
      requiresRag: false,
      intentCategory: 'CSV_ANALYSIS',
      fineCategory: 'SCHEMA_ANALYSIS',
      confidence: 0.92
    };
  }

  /**
   * 2. Execute Required Application Tools & Extract Evidence
   */
  public executeAgentTools(
    plan: MultiAgentPlan, 
    dataset?: StructuredCSVContext | { fileName: string; rowCount: number; headers: string[]; sampleRows?: Record<string, any>[]; qualityScore?: number; rows?: Record<string, any>[] }
  ): { executedTools: ToolResult[]; evidence: AgentEvidence[] } {
    if (!dataset || !dataset.headers || dataset.headers.length === 0) {
      return { executedTools: [], evidence: [] };
    }

    const headers = dataset.headers;
    const rows: Record<string, any>[] = (dataset as any).rows || (dataset as any).sampleRows || (dataset as any).sampleRowsSanitized || [];
    const executedTools: ToolResult[] = [];
    const evidence: AgentEvidence[] = [];

    const toolsToRun = new Set(plan.requiredTools);

    // 1. Dataset Profiling Summary
    if (toolsToRun.has('summarizeDataset') || toolsToRun.has('summarize_dataset')) {
      try {
        const summary = summarizeDataset(headers, rows);
        executedTools.push(summary);
      } catch (e) {
        console.warn('[Orchestrator] summarizeDataset tool execution skipped:', e);
      }
    }

    // 2. Duplicates
    if ((toolsToRun.has('findDuplicates') || toolsToRun.has('find_duplicates')) && rows.length > 0) {
      try {
        const dups = findDuplicates(headers, rows);
        executedTools.push(dups);
      } catch (e) {
        console.warn('[Orchestrator] findDuplicates tool execution skipped:', e);
      }
    }

    // 3. Missing Values
    if ((toolsToRun.has('findMissingValues') || toolsToRun.has('detect_missing_values')) && rows.length > 0) {
      try {
        const missing = findMissingValues(headers, rows);
        executedTools.push(missing);
      } catch (e) {
        console.warn('[Orchestrator] findMissingValues tool execution skipped:', e);
      }
    }

    // 4. Outliers
    if ((toolsToRun.has('detectOutliers') || toolsToRun.has('detect_outliers')) && rows.length > 0) {
      try {
        const outliers = detectOutliers(headers, rows, undefined, 2.5);
        executedTools.push(outliers);
      } catch (e) {
        console.warn('[Orchestrator] detectOutliers tool execution skipped:', e);
      }
    }

    // 5. Statistics
    if ((toolsToRun.has('calculateStatistics') || toolsToRun.has('calculate_statistics')) && rows.length > 0) {
      try {
        // Run on first numeric column
        const numericHeaders = headers.filter(h => {
          const lower = h.toLowerCase();
          return lower.includes('amount') || lower.includes('price') || lower.includes('total') || lower.includes('cost') || lower.includes('value') || lower.includes('quantity');
        });
        const targetCol = numericHeaders[0] || headers.find(h => !isNaN(Number(rows[0]?.[h])));
        if (targetCol) {
          const stats = calculateStatistics(rows, targetCol);
          executedTools.push(stats);
        }
      } catch (e) {
        console.warn('[Orchestrator] calculateStatistics tool execution skipped:', e);
      }
    }

    // 6. Formula Injections / Invalid Chars
    if ((toolsToRun.has('findInvalidCharacters') || toolsToRun.has('detect_formula_injections')) && rows.length > 0) {
      try {
        const formulaCheck = findInvalidCharacters(headers, rows);
        executedTools.push(formulaCheck);
      } catch (e) {
        console.warn('[Orchestrator] findInvalidCharacters tool execution skipped:', e);
      }
    }

    // Format Evidence using active agent formatters
    const allActiveAgents = [plan.primaryAgent, ...plan.collaboratingAgents];
    allActiveAgents.forEach(agentId => {
      const agent = SPECIALIST_AGENTS[agentId];
      if (agent && agent.evidenceFormatter) {
        const agentEvidence = agent.evidenceFormatter(executedTools, dataset);
        evidence.push(...agentEvidence);
      }
    });

    return { executedTools, evidence };
  }

  /**
   * 3. Construct Unified Enterprise System & Collaborative Context Prompt
   */
  public constructCollaborativePrompt(
    plan: MultiAgentPlan,
    request: OrchestratorRequest,
    executedTools: ToolResult[],
    evidence: AgentEvidence[],
    knowledgeChunks: KnowledgeChunk[] = []
  ): { systemInstruction: string; dynamicContextPrompt: string; meta: MultiAgentUnifiedResponseMeta } {
    const primaryAgentDef = SPECIALIST_AGENTS[plan.primaryAgent];
    const collaboratingDefs = plan.collaboratingAgents.map(id => SPECIALIST_AGENTS[id]).filter(Boolean);

    // Active agent metadata
    const activeAgents = [
      { id: primaryAgentDef.id, name: primaryAgentDef.name, role: primaryAgentDef.title },
      ...collaboratingDefs.map(c => ({ id: c.id, name: c.name, role: c.title }))
    ];

    // Build System Instruction
    let systemInstruction = `You are the Enterprise AI Specialist System for CSV Auditor Pro.
PRIMARY SPECIALIST: ${primaryAgentDef.name} (${primaryAgentDef.title})
${primaryAgentDef.systemDirective}\n`;

    if (collaboratingDefs.length > 0) {
      systemInstruction += `\nCOLLABORATING SPECIALISTS:\n`;
      collaboratingDefs.forEach(collab => {
        systemInstruction += `- ${collab.name} (${collab.title}): ${collab.description}\n`;
      });
      systemInstruction += `\nCOLLABORATION PROTOCOL:
Synthesize insights from the Primary and Collaborating specialists into ONE coherent, seamless enterprise response.
Structure your findings into clear, authoritative sections:
1. Executive Summary / Direct Finding
2. Forensic Evidence & Metrics (cite exact columns, rows, counts, and statistical parameters)
3. Actionable Recommendations & Remediation Steps\n`;
    }

    systemInstruction += `\nENTERPRISE COMMUNICATION STANDARDS:
- Tone: Professional, technical, concise, authoritative, and actionable.
- Formats: Use clean bullet points, markdown bolding for key terms, and exact numeric statistics.
- Icons: Never use emojis. Use clean semantic markdown layout.
- Anti-Slop: Strictly avoid generic filler, fake pleasantries, or flowery marketing adjectives.
- Evidence-Based: Every factual claim about dataset quality or metrics must be corroborated by the injected tool results. Never hallucinate row counts or metrics.`;

    // Dynamic Context Builder
    let dynamicContextPrompt = `### ACTIVE ORCHESTRATION CONTEXT\n`;
    dynamicContextPrompt += `- Primary Specialist: **${primaryAgentDef.name}**\n`;
    if (collaboratingDefs.length > 0) {
      dynamicContextPrompt += `- Collaborating Specialists: ${collaboratingDefs.map(c => `**${c.name}**`).join(', ')}\n`;
    }
    dynamicContextPrompt += `- Routing Rationale: ${plan.routingRationale}\n`;

    if (request.userContext) {
      dynamicContextPrompt += `- User Context: Tier=${request.userContext.tier || 'Enterprise'}, Org=${request.userContext.organizationName || 'Default Workspace'}, Role=${request.userContext.role || 'Data Lead'}\n`;
    }

    // Dataset Context
    if (request.datasetContext && request.datasetContext.headers && request.datasetContext.headers.length > 0) {
      dynamicContextPrompt += `\n### DATASET CONTEXT\n`;
      dynamicContextPrompt += `- File: "${request.datasetContext.fileName || 'active_dataset.csv'}"\n`;
      dynamicContextPrompt += `- Total Rows: ${(request.datasetContext.rowCount || 0).toLocaleString()} | Total Columns: ${request.datasetContext.headers.length}\n`;
      dynamicContextPrompt += `- Quality Score: ${request.datasetContext.qualityScore || 95}/100\n`;
      dynamicContextPrompt += `- Column Headers: ${request.datasetContext.headers.join(', ')}\n`;

      const sampleRows = request.datasetContext.sampleRowsSanitized || (request.datasetContext as any).sampleRows || [];
      if (sampleRows.length > 0) {
        dynamicContextPrompt += `- Sample Data Records (First ${sampleRows.length}):\n`;
        dynamicContextPrompt += '```json\n' + JSON.stringify(sampleRows.slice(0, 3), null, 2) + '\n```\n';
      }
    }

    // Tool Results Evidence
    if (executedTools.length > 0) {
      dynamicContextPrompt += `\n### EXECUTED APPLICATION AUDIT TOOLS & DETERMINISTIC EVIDENCE\n`;
      executedTools.forEach(tool => {
        dynamicContextPrompt += `\n#### Tool: ${tool.toolName} (Execution Success: ${tool.success})\n`;
        dynamicContextPrompt += `Summary: ${tool.summary}\n`;
        dynamicContextPrompt += '```json\n' + JSON.stringify(tool.data, null, 2) + '\n```\n';
      });
    }

    // Knowledge Base Chunks
    if (knowledgeChunks.length > 0) {
      dynamicContextPrompt += `\n### RETRIEVED ENTERPRISE KNOWLEDGE BASE (GROUNDING)\n`;
      knowledgeChunks.forEach((chunk, i) => {
        dynamicContextPrompt += `\n[Doc ${i + 1} - ${chunk.title} (${chunk.category})]:\n${chunk.content}\n`;
      });
    }

    dynamicContextPrompt += `\n### USER QUERY:\n"${request.prompt}"\n`;

    const meta: MultiAgentUnifiedResponseMeta = {
      orchestratorPlan: plan,
      activeAgents,
      evidenceCollected: evidence,
      executedTools: executedTools.map(t => t.toolName),
      retrievedDocs: knowledgeChunks.map(c => c.title),
      confidenceScore: plan.confidence,
      modelUsed: 'gemini-3.7-flash',
      latencyMs: 0
    };

    return { systemInstruction, dynamicContextPrompt, meta };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
