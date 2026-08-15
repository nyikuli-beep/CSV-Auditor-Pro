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
import { buildWorkspaceMemoryPromptBlock, recordConversationInsightInMemory } from '../workspaceMemoryEngine';
import { evaluateResponseConfidence } from '../confidenceScoringEngine';
import { evaluateEnterpriseRisks } from '../riskAssessmentEngine';
import { generatePrioritizedRecommendations, scanProactiveInsights, generateFollowUpSuggestions } from '../recommendationEngine';
import { buildExplainabilityPackage } from '../explainableEngine';
import { generateExecutiveReport } from '../executiveReportEngine';

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

    // Rule 0: Conversational Greetings & Pleasantries (Execution Path: CONVERSATION)
    // NEVER execute tools or inject dataset context
    if (intentResult.executionPath === 'CONVERSATION' || intentResult.category === 'GREETING' || intentResult.category === 'GENERAL_CONVERSATION' || intentResult.category === 'CONVERSATIONAL_GREETING') {
      return {
        primaryAgent: 'product_support_agent',
        collaboratingAgents: [],
        isCompoundQuery: false,
        routingRationale: 'Conversational greeting or pleasantry. Routing directly to Gemini without dataset tools or summaries.',
        requiredTools: [],
        requiresRag: false,
        intentCategory: 'GREETING',
        fineCategory: 'GREETING',
        executionPath: 'CONVERSATION',
        requiresDatasetAnalysis: false,
        confidence: 0.99
      };
    }

    // Rule 1: General AI, Help, Dashboard Questions, Platform Guidance (Execution Path: GENERAL_AI)
    // NEVER execute dataset tools unless explicit CSV operation is requested
    if (intentResult.executionPath === 'GENERAL_AI' || !intentResult.requiresDatasetAnalysis) {
      const isProductHelp = intentResult.category === 'HELP' || intentResult.category === 'ENTERPRISE_PLATFORM_GUIDANCE' || intentResult.category === 'DASHBOARD_QUESTIONS';
      return {
        primaryAgent: isProductHelp ? 'product_support_agent' : 'general_knowledge_agent',
        collaboratingAgents: [],
        isCompoundQuery: false,
        routingRationale: intentResult.reasoning || 'General AI query. Routing directly to Gemini without dataset analysis.',
        requiredTools: [],
        requiresRag: false,
        intentCategory: intentResult.category,
        fineCategory: intentResult.fineCategory,
        executionPath: 'GENERAL_AI',
        requiresDatasetAnalysis: false,
        confidence: intentResult.confidenceScore || 0.95
      };
    }

    // Rule 2: CSV Operations (Execution Path: CSV_OPERATIONS)
    // Explicit dataset analysis, cleaning, BI brief, statistics, compliance requested by user
    const hasBusinessIntent = lower.includes('sales') || lower.includes('revenue') || lower.includes('trend') || lower.includes('business') || lower.includes('kpi') || lower.includes('executive') || lower.includes('decision') || intentResult.category === 'EXECUTIVE_BI_BRIEF';
    const hasQualityIntent = lower.includes('quality') || lower.includes('duplicate') || lower.includes('missing') || lower.includes('null') || lower.includes('blank') || lower.includes('invalid') || lower.includes('error') || intentResult.category === 'CSV_ANALYSIS';
    const hasStatsIntent = lower.includes('statistic') || lower.includes('outlier') || lower.includes('mean') || lower.includes('distribution') || lower.includes('correlation') || lower.includes('deviation') || lower.includes('z-score');
    const hasCleaningIntent = lower.includes('clean') || lower.includes('fix') || lower.includes('remedy') || lower.includes('standardize') || lower.includes('format') || lower.includes('normalize') || intentResult.category === 'DATA_CLEANING';
    const hasComplianceIntent = lower.includes('compliance') || lower.includes('gdpr') || lower.includes('soc2') || lower.includes('privacy') || lower.includes('pii') || lower.includes('formula') || lower.includes('security') || intentResult.category === 'COMPLIANCE';

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
        intentCategory: 'EXECUTIVE_BI_BRIEF',
        fineCategory: 'EXECUTIVE_BI_BRIEF',
        executionPath: 'CSV_OPERATIONS',
        requiresDatasetAnalysis: true,
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
        intentCategory: 'DATA_CLEANING',
        fineCategory: 'DATA_CLEANING',
        executionPath: 'CSV_OPERATIONS',
        requiresDatasetAnalysis: true,
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
        requiresRag: false,
        intentCategory: 'COMPLIANCE',
        fineCategory: 'COMPLIANCE',
        executionPath: 'CSV_OPERATIONS',
        requiresDatasetAnalysis: true,
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
        fineCategory: 'CSV_ANALYSIS',
        executionPath: 'CSV_OPERATIONS',
        requiresDatasetAnalysis: true,
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
        intentCategory: 'DATA_CLEANING',
        fineCategory: 'DATA_CLEANING',
        executionPath: 'CSV_OPERATIONS',
        requiresDatasetAnalysis: true,
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
        intentCategory: 'EXECUTIVE_BI_BRIEF',
        fineCategory: 'EXECUTIVE_BI_BRIEF',
        executionPath: 'CSV_OPERATIONS',
        requiresDatasetAnalysis: true,
        confidence: 0.96
      };
    }

    // Explicit CSV analysis fallback
    return {
      primaryAgent: 'data_quality_auditor',
      collaboratingAgents: [],
      isCompoundQuery: false,
      routingRationale: 'General dataset inspection and quality audit requested on active CSV.',
      requiredTools: ['summarizeDataset', 'findMissingValues', 'findDuplicates'],
      requiresRag: false,
      intentCategory: 'CSV_ANALYSIS',
      fineCategory: 'CSV_ANALYSIS',
      executionPath: 'CSV_OPERATIONS',
      requiresDatasetAnalysis: true,
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
    let systemInstruction = `You are the Enterprise Conversational Auditor inside CSV Auditor Pro. Your role is to provide accurate, professional, enterprise-grade responses. Respond naturally to greetings and general questions. Only perform CSV analysis when the user's request explicitly requires it. Never assume the user wants dataset analysis simply because a CSV exists. When CSV analysis is requested, explain findings clearly, provide actionable recommendations, and maintain a professional enterprise tone.
PRIMARY SPECIALIST: ${primaryAgentDef.name} (${primaryAgentDef.title})
${primaryAgentDef.systemDirective}\n`;

    // Strict Conversational Intent Guardrails
    systemInstruction += `\nCONVERSATIONAL INTENT & GUARDRAIL DIRECTIVES:
1. NATURAL, DIRECT RESPONSES:
   - Begin your responses directly with the answer itself.
   - NEVER prepend responses with "Regarding...", "Based on the knowledge base...", "According to stored information...", or any generic template opening.
   - If the user provides a greeting or pleasantry (e.g., "Hi", "Hello", "Hey", "Thanks", "How are you?"), respond warmly and helpfully as the Enterprise Conversational Auditor, giving a brief orientation without dumping unrequested documentation or dataset summaries.

2. GENERAL KNOWLEDGE CAPABILITY:
   - You have deep dynamic intelligence in software engineering, SQL, Python, mathematics, statistics, data science, spreadsheet formulas, cloud architecture, and data governance. Answer general inquiries directly using your dynamic intelligence.

3. DATASET FORENSICS & UNCERTAINTY HANDLING:
   - When analyzing an active dataset, cite exact column names, real counts, and calculated metrics from the provided dynamic context.
   - If requested information or columns are not present in the dataset, clearly state what is missing rather than fabricating data.

4. ENTERPRISE COMMUNICATION STANDARDS:
   - Tone: Professional, technical, concise, authoritative, and actionable.
   - Formats: Use clean bullet points, markdown bolding for key terms, and exact numeric statistics.
   - Icons: Never use emojis. Use clean semantic markdown layout.
   - Anti-Slop: Strictly avoid generic filler, artificial marketing hype, or flowery adjectives.\n`;

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

    // Dynamic Context Builder
    let dynamicContextPrompt = `### ACTIVE ORCHESTRATION CONTEXT\n`;
    dynamicContextPrompt += `- Primary Specialist: **${primaryAgentDef.name}**\n`;
    if (collaboratingDefs.length > 0) {
      dynamicContextPrompt += `- Collaborating Specialists: ${collaboratingDefs.map(c => `**${c.name}**`).join(', ')}\n`;
    }
    dynamicContextPrompt += `- Routing Rationale: ${plan.routingRationale}\n`;

    // 1. Inject Workspace Intelligence Memory
    const workspaceId = request.userContext?.teamId || 'org-enterprise-root';
    const workspaceMemoryBlock = buildWorkspaceMemoryPromptBlock(workspaceId);
    dynamicContextPrompt += `\n${workspaceMemoryBlock}\n`;

    if (request.userContext) {
      dynamicContextPrompt += `- User Context: Tier=${request.userContext.tier || 'Enterprise'}, Org=${request.userContext.organizationName || 'Default Workspace'}, Role=${request.userContext.role || 'Data Lead'}\n`;
    }

    // Dataset Context - ONLY inject when plan.requiresDatasetAnalysis is true
    const hasDataset = Boolean(request.datasetContext && request.datasetContext.headers && request.datasetContext.headers.length > 0);
    const shouldInjectDataset = plan.requiresDatasetAnalysis !== false && hasDataset;
    if (shouldInjectDataset && request.datasetContext) {
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

    // Phase 3 Intelligence Engines
    // 1. Evidence-Driven Confidence Assessment
    const confidenceAssessment = evaluateResponseConfidence({
      datasetContext: request.datasetContext,
      executedTools,
      evidenceCollected: evidence,
      requiresRag: plan.requiresRag,
      ragMatchesCount: knowledgeChunks.length,
      hasActiveDataset: hasDataset,
      intentCategory: plan.intentCategory
    });

    // 2. Enterprise Risk Assessment
    const riskAssessment = evaluateEnterpriseRisks(request.datasetContext, executedTools, evidence);

    // 3. Prioritized Recommendations
    const recommendations = generatePrioritizedRecommendations(request.datasetContext, riskAssessment, executedTools, evidence);

    // 4. Proactive Insights
    const proactiveInsights = scanProactiveInsights(request.datasetContext, executedTools, evidence);

    // 5. Explainable AI Package
    const explainability = buildExplainabilityPackage(request.datasetContext, executedTools, evidence);

    // 6. Follow-up Suggestions
    const followUpSuggestions = generateFollowUpSuggestions(
      plan.intentCategory,
      hasDataset,
      riskAssessment.overallRisk,
      plan.primaryAgent
    );

    // 7. Executive Report Generation if requested or if query asks for report
    const promptLower = request.prompt.toLowerCase();
    const isExecutiveReportRequested = 
      promptLower.includes('executive report') || 
      promptLower.includes('executive summary') || 
      promptLower.includes('audit report') || 
      promptLower.includes('generate report') || 
      promptLower.includes('compliance report');

    let executiveReport = undefined;
    if (isExecutiveReportRequested && hasDataset && request.datasetContext) {
      executiveReport = generateExecutiveReport({
        dataset: request.datasetContext,
        organizationName: request.userContext?.organizationName || 'CSV Auditor Pro Enterprise Workspace',
        riskAssessment,
        recommendations,
        confidenceAssessment,
        auditorName: primaryAgentDef.name
      });
    }

    // Record key insight into workspace memory
    if (hasDataset && request.datasetContext) {
      const insightSummary = `${primaryAgentDef.name} analyzed "${request.datasetContext.fileName}": Health Score ${request.datasetContext.qualityScore || 95}%, Risk: ${riskAssessment.overallRisk.toUpperCase()}, Confidence: ${confidenceAssessment.percentage}%`;
      recordConversationInsightInMemory(workspaceId, insightSummary);
    }

    const meta: MultiAgentUnifiedResponseMeta = {
      orchestratorPlan: plan,
      activeAgents,
      evidenceCollected: evidence,
      executedTools: executedTools.map(t => t.toolName),
      retrievedDocs: knowledgeChunks.map(c => c.title),
      confidenceScore: confidenceAssessment.overallScore,
      confidenceAssessment,
      riskAssessment,
      recommendations,
      proactiveInsights,
      explainability,
      followUpSuggestions,
      executiveReport,
      modelUsed: 'gemini-3.7-flash',
      latencyMs: 0
    };

    return { systemInstruction, dynamicContextPrompt, meta };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
