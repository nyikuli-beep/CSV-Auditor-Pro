import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

interface VercelReq extends IncomingMessage {
  body?: any;
  query?: Record<string, string>;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelRes extends ServerResponse {
  status(code: number): this;
  json(data: any): this;
  send(data: any): this;
  setHeader(name: string, value: string | string[]): this;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

const SYSTEM_INSTRUCTION = `You are the CSV Auditor Pro AI data auditor.
STRICT INSTRUCTIONS:
1. When CSV context is provided (file name, columns, rows, missing values, duplicates, formula injections, quality score):
   - Answer the question accurately using the provided CSV audit context.
   - Distinguish verified observed facts from recommendations.
   - Never invent rows, numbers, or column names not present in the context.
   - When asked for remediation or how to fix issues, provide practical, concrete guidance (e.g. SQL, Python Pandas, or workflow steps).
2. When answering general questions (e.g. "What does duplicate data mean?", "Explain formula injection"):
   - Provide a clear, professional explanation without requiring CSV context.
3. If the context does not contain enough data to answer a specific question, state so directly.
4. Format output using clean Markdown headings, bullet points, and code blocks. Avoid emojis.`;

export default async function handler(req: VercelReq, res: VercelRes) {
  // CORS & Preflight handling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('OK');
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `HTTP 405 Method Not Allowed: Endpoint only accepts POST requests. Received: ${req.method}`
      },
      allowedMethods: ['POST']
    });
    return;
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const modelName = 'gemini-3.7-flash';

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const message = (body.message || body.prompt || '').trim();
    if (!message) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required field: "message" must not be empty.'
        },
        requestId
      });
      return;
    }

    // Special verification test handler
    if (message === 'Return exactly: CSV AUDITOR GEMINI CONNECTION VERIFIED') {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'GEMINI_API_KEY is not configured on the server.'
          },
          requestId
        });
        return;
      }

      const testResponse = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: 'Return exactly the single phrase: CSV AUDITOR GEMINI CONNECTION VERIFIED' }] }],
        config: { temperature: 0.0, maxOutputTokens: 50 }
      });

      const reply = (testResponse.text || '').trim();
      res.status(200).json({
        success: true,
        answer: reply,
        model: modelName,
        requestId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Extract CSV and file context
    const csvContext = body.csvContext || {};
    const fileContext = body.fileContext || {};
    const fileName = csvContext.fileName || fileContext.name || 'dataset.csv';
    const rowCount = csvContext.rowCount ?? (fileContext.rows ? fileContext.rows.length : 'Unknown');
    const headers = csvContext.headers || fileContext.headers || [];
    const score = csvContext.score ?? fileContext.score;
    const issues = csvContext.auditFindings || fileContext.issues || [];
    const sampleRows = fileContext.rows ? fileContext.rows.slice(0, 15) : [];

    const hasCsvContext = Boolean(csvContext.fileName || fileContext.name || headers.length > 0 || issues.length > 0);

    let promptContent = `User Inquiry: ${message}\n`;
    if (hasCsvContext) {
      promptContent += `\n--- CSV CONTEXT ---\n`;
      promptContent += `File Name: ${fileName}\n`;
      promptContent += `Row Count: ${rowCount}\n`;
      if (headers.length > 0) {
        promptContent += `Headers / Columns (${headers.length}): ${headers.join(', ')}\n`;
      }
      if (score !== undefined) {
        promptContent += `Data Quality Score: ${score}/100\n`;
      }
      if (issues.length > 0) {
        promptContent += `Audit Findings & Detected Issues (${issues.length}):\n`;
        promptContent += JSON.stringify(issues.slice(0, 20), null, 2) + '\n';
      }
      if (sampleRows.length > 0) {
        promptContent += `Sample Data Rows (${sampleRows.length}):\n`;
        promptContent += JSON.stringify(sampleRows, null, 2) + '\n';
      }
      promptContent += `--- END CSV CONTEXT ---\n`;
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Deterministic fallback if API key is not yet configured in preview
      const fallbackAnswer = generateGroundedDeterministicResponse(message, {
        fileName,
        rowCount,
        headers,
        score,
        issues,
        sampleRows
      });

      res.status(200).json({
        success: true,
        answer: fallbackAnswer,
        grounding: hasCsvContext ? 'data-verified' : 'general',
        source: fileName,
        requestId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Include recent history if present
    if (Array.isArray(body.conversationHistory)) {
      for (const item of body.conversationHistory.slice(-6)) {
        if (item.content && (item.role === 'user' || item.role === 'assistant')) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }]
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: promptContent }]
    });

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];
    let answer = '';
    let usedModel = 'gemini-3.7-flash';
    let lastError: any = null;

    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
            maxOutputTokens: 1200
          }
        });

        answer = (response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        if (answer) {
          usedModel = m;
          lastError = null;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[api/chat] Gemini model ${m} error:`, err?.message || err);
      }
    }

    if (!answer) {
      if (lastError) {
        throw lastError;
      }
      answer = generateGroundedDeterministicResponse(message, {
        fileName,
        rowCount,
        headers,
        score,
        issues,
        sampleRows
      });
    }

    res.status(200).json({
      success: true,
      answer,
      grounding: hasCsvContext ? 'data-verified' : 'general',
      source: fileName,
      model: usedModel,
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const upstreamStatus = err?.status || err?.code || 500;
    const errorMessage = err?.message || 'Failed to generate audit response.';
    console.error(`[API /api/chat] [${requestId}] Upstream error:`, errorMessage);

    res.status(typeof upstreamStatus === 'number' && upstreamStatus >= 400 && upstreamStatus < 600 ? upstreamStatus : 500).json({
      success: false,
      error: {
        code: 'AI_REQUEST_FAILED',
        message: errorMessage
      },
      upstreamStatus,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
}

function generateGroundedDeterministicResponse(
  query: string,
  ctx: {
    fileName: string;
    rowCount: any;
    headers: string[];
    score: any;
    issues: any[];
    sampleRows: any[];
  }
): string {
  const lower = query.toLowerCase();

  if (lower.includes('biggest') || lower.includes('issue') || lower.includes('problem') || lower.includes('data-quality')) {
    let out = `### Data Quality Audit Findings for "${ctx.fileName}"\n\n`;
    if (ctx.score !== undefined) {
      out += `Overall Data Quality Score: **${ctx.score}/100** (Rows: **${ctx.rowCount}**, Columns: **${ctx.headers.length}**)\n\n`;
    }
    if (ctx.issues && ctx.issues.length > 0) {
      out += `### Primary Detected Issues:\n`;
      ctx.issues.slice(0, 5).forEach((issue, idx) => {
        out += `${idx + 1}. **${(issue.type || 'Finding').replace(/_/g, ' ').toUpperCase()}** on column \`${issue.column || 'N/A'}\`: ${issue.count || 1} instance(s) (${issue.severity || 'medium'} severity).\n`;
      });
      out += `\n### Recommended Remediation:\n- Review and sanitize columns with validation errors.\n- Apply deduplication or fallback values to null fields.`;
    } else {
      out += `No severe anomalies detected in the current audit analysis.`;
    }
    return out;
  }

  if (lower.includes('column') || lower.includes('remediat')) {
    const columnsWithIssues = Array.from(new Set(ctx.issues.map(i => i.column).filter(Boolean)));
    if (columnsWithIssues.length > 0) {
      return `### Columns Requiring Attention in "${ctx.fileName}":\n\n` +
        columnsWithIssues.map(c => `- **\`${c}\`**: Requires remediation due to detected anomalies/missing values.`).join('\n') +
        `\n\n**Action Steps**: Select each column in the Cleaning Center to apply transformations or default imputations.`;
    }
  }

  return `### Dataset Analysis for "${ctx.fileName}"\n\n- **Total Rows**: ${ctx.rowCount}\n- **Columns**: ${ctx.headers.join(', ')}\n- **Quality Score**: ${ctx.score ?? 'N/A'}/100\n- **Issues Detected**: ${ctx.issues.length}`;
}
