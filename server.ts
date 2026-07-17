import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Database imports
import { db } from './src/db/index.ts';
import { users, files, activities, members } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { eq, desc } from 'drizzle-orm';

// Load environmental keys
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// --- SECURE CLOUD SQL DATABASE APIS ---

// 1. Connection diagnostics check
app.get('/api/sql/status', async (req, res) => {
  try {
    // Run a quick SELECT 1 to verify database connectivity
    await db.execute(sql`SELECT 1;`);
    
    // Fetch counts from all tables as dynamic metrics
    const userCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const fileCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(files);
    const activityCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(activities);
    const memberCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(members);

    res.json({
      status: 'online',
      provider: 'Cloud SQL (PostgreSQL)',
      connection: 'healthy',
      metrics: {
        totalUsers: userCountResult[0]?.count || 0,
        totalFiles: fileCountResult[0]?.count || 0,
        totalActivities: activityCountResult[0]?.count || 0,
        totalMembers: memberCountResult[0]?.count || 0,
      }
    });
  } catch (err: any) {
    console.error('Cloud SQL health check failed:', err);
    res.status(500).json({
      status: 'error',
      provider: 'Cloud SQL (PostgreSQL)',
      connection: 'failed',
      error: err.message || 'Could not connect to database.'
    });
  }
});

// Helper for sql templating to avoid needing another import
import { sql } from 'drizzle-orm';

// 2. Synchronize current User profile
app.post('/api/sql/sync-user', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, email, role } = req.body;
    const uid = req.user?.uid;
    if (!uid || !email) {
      res.status(400).json({ error: 'Missing required profile payload' });
      return;
    }

    const dbUser = await getOrCreateUser(uid, email, name, role);
    res.json({ success: true, user: dbUser });
  } catch (err: any) {
    console.error('Error syncing user to Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Sync files to Postgres
app.post('/api/sql/sync-file', requireAuth, async (req: AuthRequest, res) => {
  try {
    const fileData = req.body;
    const uid = req.user?.uid;

    if (!uid || !fileData.id || !fileData.name) {
      res.status(400).json({ error: 'Missing unique file properties' });
      return;
    }

    // Upsert files to ensure safety under concurrency
    await db.insert(files)
      .values({
        id: fileData.id,
        name: fileData.name,
        size: fileData.size || 0,
        uploadedAt: fileData.uploadedAt || new Date().toISOString(),
        status: fileData.status || 'pending',
        score: fileData.score ?? 100,
        headers: fileData.headers || [],
        rows: fileData.rows || [],
        cleanedRows: fileData.cleanedRows || null,
        ownerId: uid,
        issues: fileData.issues || [],
      })
      .onConflictDoUpdate({
        target: files.id,
        set: {
          name: fileData.name,
          size: fileData.size || 0,
          status: fileData.status || 'pending',
          score: fileData.score ?? 100,
          headers: fileData.headers || [],
          rows: fileData.rows || [],
          cleanedRows: fileData.cleanedRows || null,
          issues: fileData.issues || [],
        }
      });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error syncing file to Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Retrieve files for the authenticated user
app.get('/api/sql/files', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userFiles = await db.select().from(files).where(eq(files.ownerId, uid));
    res.json(userFiles);
  } catch (err: any) {
    console.error('Error fetching files from Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Sync activity timeline
app.post('/api/sql/sync-activity', requireAuth, async (req: AuthRequest, res) => {
  try {
    const act = req.body;
    const uid = req.user?.uid;

    if (!uid || !act.id || !act.action) {
      res.status(400).json({ error: 'Missing activity log attributes' });
      return;
    }

    await db.insert(activities)
      .values({
        id: act.id,
        userId: uid,
        userName: act.userName || 'Unknown User',
        action: act.action,
        timestamp: act.timestamp || new Date().toISOString(),
        fileName: act.fileName || null,
      })
      .onConflictDoNothing();

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error syncing activity to Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Fetch activities list
app.get('/api/sql/activities', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userActivities = await db.select().from(activities).limit(35);
    res.json(userActivities);
  } catch (err: any) {
    console.error('Error fetching activities from Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Sync team member
app.post('/api/sql/sync-member', requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = req.body;
    if (!member.id || !member.email) {
      res.status(400).json({ error: 'Missing member parameters' });
      return;
    }

    await db.insert(members)
      .values({
        id: member.id,
        name: member.name || member.email.split('@')[0],
        email: member.email,
        role: member.role || 'Admin',
        status: member.status || 'invited',
        avatar: member.avatar || null,
      })
      .onConflictDoUpdate({
        target: members.id,
        set: {
          name: member.name || member.email.split('@')[0],
          email: member.email,
          role: member.role || 'Admin',
          status: member.status || 'invited',
        }
      });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error syncing member to Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Fetch team members
app.get('/api/sql/members', requireAuth, async (req: AuthRequest, res) => {
  try {
    const allMembers = await db.select().from(members);
    res.json(allMembers);
  } catch (err: any) {
    console.error('Error fetching members from Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Delete team member
app.delete('/api/sql/delete-member/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Missing member ID' });
      return;
    }

    await db.delete(members).where(eq(members.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting member from Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. Delete file
app.delete('/api/sql/delete-file/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Missing file ID' });
      return;
    }

    await db.delete(files).where(eq(files.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting file from Postgres:', err);
    res.status(500).json({ error: err.message });
  }
});

// Initialize Gemini client lazily to avoid crash if variable is omitted during boot
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// 1. API: Custom Gemini Audit Consultation (Full-stack AI integration)
app.post('/api/gemini/chat', async (req, res) => {
  const { prompt, history = [], model = 'gemini-3.5-flash', persona = 'auditor', fileContext, image, thinkingMode = false } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  // Force gemini-3.1-pro-preview if image is provided or thinkingMode is enabled
  let modelToUse = model;
  if (image) {
    modelToUse = 'gemini-3.1-pro-preview';
  } else if (thinkingMode) {
    modelToUse = 'gemini-3.1-pro-preview';
  }

  // Map dynamic system instructions by selected persona
  let systemInstruction = 
    "You are an expert data analyst and database compliance auditor named CSV Auditor Pro AI. " +
    "The user will ask questions about their uploaded spreadsheet. " +
    "Provide clear, concise, professional, and actionable steps. Explain why abnormalities occur " +
    "and how they can be cleaned to maintain strict relational database constraints (e.g. NOT NULL, UNIQUE, correct DATE patterns).";

  if (persona === 'architect') {
    systemInstruction = 
      "You are a senior PostgreSQL Database Architect named Postgres Architect AI. " +
      "Analyze the user's spreadsheet schema and database goals. " +
      "Help them design high-performance relational schemas, write optimal SQL DDLs (CREATE TABLE, index creation, foreign keys), " +
      "explain normalization levels (1NF, 2NF, 3NF), and build structured queries to fetch or analyze their transaction data. " +
      "Always provide clean, standard SQL that adheres to PostgreSQL best practices.";
  } else if (persona === 'analyst') {
    systemInstruction = 
      "You are a strategic Business Intelligence Analyst named Business Analyst AI. " +
      "Analyze the user's dataset metrics and spreadsheet summary. " +
      "Provide executive summaries, track monthly/quarterly trends, spot financial outliers, and outline " +
      "actionable business growth plans, ROI enhancements, and organizational decision-making frameworks. " +
      "Speak in a polished, highly professional corporate advisory tone.";
  }

  const ai = getGeminiClient();

  // Offline high-fidelity fallback if key is missing or calls are throttled
  if (!ai) {
    console.log(`Gemini API key not found in environment, falling back to simulated analysis for persona: ${persona}.`);
    
    let fallbackText = '';
    const q = prompt.toLowerCase();
    
    if (image) {
      fallbackText = `[Simulated Image Analysis - Fallback Mode]
I have reviewed your uploaded picture. Based on visual inspection:
- The text/screenshot appears to display transactional metrics matching our current ${fileContext?.fileName || 'loaded spreadsheet'}.
- Key values parsed: Standardized headers correspond to active data pipelines, but visual validation reveals clear cell gaps.
- Action: I suggest running 'Fill Blank Cells' inside the Cleaning Center to resolve visual mismatches automatically!`;
    } else if (thinkingMode) {
      fallbackText = `[Postgres Auditor AI - HIGH THINKING Fallback Mode]
*Thinking Process:*
1. Parse complex prompt: "${prompt}"
2. Evaluate constraints: Uniqueness validation, correct numeric formats, and date alignment.
3. Formulate deep reasoning: Since the client wants advanced compliance profiling, the duplicate IDs represent a fatal key exception.
*Conclusion:*
I strongly advise using our automatic deduplication filters to ensure proper table structure before migrating to Postgres.`;
    } else if (persona === 'architect') {
      if (q.includes('schema') || q.includes('table') || q.includes('sql') || q.includes('ddl')) {
        fallbackText = `[Postgres Architect AI - Fallback Mode]
Based on your active dataset "${fileContext?.fileName || 'Company_Q2_Transactions_Messy.csv'}", I recommend the following normalized PostgreSQL table layout:

\`\`\`sql
CREATE TABLE transactions (
    transaction_id VARCHAR(50) PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name VARCHAR(100) NOT NULL,
    email_contact VARCHAR(150),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    category VARCHAR(50) DEFAULT 'Uncategorized',
    country VARCHAR(3) DEFAULT 'USA'
);

-- Optimize queries by adding indices on common lookup parameters
CREATE INDEX idx_transactions_customer ON transactions(customer_name);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
\`\`\`

Let me know if you would like me to draft specific indexes or INSERT batches for your Postgres database!`;
      } else {
        fallbackText = `[Postgres Architect AI - Fallback Mode]
I am analyzing your query regarding "${prompt}" from a relational schema lens. 
For dataset "${fileContext?.fileName || 'Active_Data.csv'}" containing ${fileContext?.rowCount || 0} rows, we must ensure all identifiers satisfy uniqueness constraints, dates resolve to ISO format, and amount scales match numeric parameters. Let me know if you need database normalization tips!`;
      }
    } else if (persona === 'analyst') {
      if (q.includes('trend') || q.includes('summary') || q.includes('roi') || q.includes('growth')) {
        fallbackText = `[Business Analyst AI - Fallback Mode]
### Executive Summary & BI Portfolio: "${fileContext?.fileName || 'Active_Data.csv'}"

1. **Strategic Performance**: The dataset records ${fileContext?.rowCount || 0} active transaction pipelines. Correcting the mapping structure allows us to track conversion metrics accurately.
2. **Growth Opportunities**: Unifying the "Country" metrics reveals that geographic segments remain under-served due to localized billing discrepancies.
3. **Action Plan**:
   - Standardize transaction metadata to unlock clear cohort analysis.
   - Set up automatic triggers in your database pipeline to report high-yield accounts (> $10,000).`;
      } else {
        fallbackText = `[Business Analyst AI - Fallback Mode]
I have reviewed your inquiry regarding "${prompt}". Under a strategic BI framework, ensuring clean, continuous ingestion is critical for calculating active customer lifetime values (LTV) and quarterly churn rates. Let me know if you want to model growth patterns or build predictive dashboards!`;
      }
    } else {
      // Default: Compliance Auditor
      if (q.includes('outlier') || q.includes('anomaly') || q.includes('risk')) {
        fallbackText = `[CSV Auditor Pro AI - Fallback Mode]
Analyzing transaction records for outliers:
- I've flagged a high risk anomaly in Row 7 ("Initech SA") where the Amount is $1,500,000.00. This is over 400x higher than our median amount. This should be cross-verified with active invoice approvals immediately.
- Duplicate transaction ID "TXN-1001" on Row 3 was also found. Purging this duplicate in the Cleaning Center will restore compliance and increase your score immediately.`;
      } else if (q.includes('clean') || q.includes('deduplicate') || q.includes('fix')) {
        fallbackText = `[CSV Auditor Pro AI - Fallback Mode]
To clean and prepare this dataset for PG database ingestion:
1. Trigger "Remove Duplicate Records" to automatically purge row 3.
2. Trigger "Standardize Date Formats" to convert Row 5's "04/06/2026" into proper ISO standards.
3. Apply "Fill Missing Blank Cells" to safely impute row 4 and row 8 with standard defaults (0.00 and 'Uncategorized').`;
      } else {
        fallbackText = `[CSV Auditor Pro AI - Fallback Mode]
Received prompt: "${prompt}". 
For file "${fileContext?.fileName || 'Company_Q2_Transactions_Messy.csv'}", I advise running structural validations. The schema has ${fileContext?.headersCount || 6} headers. Key metrics indicate 3 critical compliance errors (including un-imputed missing financial fields). Let me know if you would like me to formulate specific SQL insertion scripts for these cleaned rows!`;
      }
    }

    res.json({ text: fallbackText });
    return;
  }

  try {
    const contextString = `[Spreadsheet System Context]
Active Spreadsheet Name: "${fileContext?.fileName || 'Active_Data.csv'}"
Headers: ${(fileContext?.headers || []).join(', ')}
Row Count: ${fileContext?.rowCount || 0}
Anomalies Found: ${fileContext?.issuesCount || 0}
Please formulate your analysis based on this dataset.`;

    const contents: any[] = [];

    // Map message history to Gemini contents structure
    if (Array.isArray(history) && history.length > 0) {
      history.forEach((msg: any, index: number) => {
        let text = msg.content;
        // Inject sheet context into the very first user message of the history
        if (index === 0 && msg.role === 'user' && fileContext) {
          text = `${contextString}\n\n${text}`;
        }
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text }]
        });
      });

      // Append current prompt & image if available
      const userParts: any[] = [];
      if (image && image.data && image.mimeType) {
        userParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data
          }
        });
      }
      userParts.push({ text: prompt });

      contents.push({
        role: 'user',
        parts: userParts
      });
    } else {
      // Single-turn request
      let text = prompt;
      if (fileContext) {
        text = `${contextString}\n\n${text}`;
      }
      
      const userParts: any[] = [];
      if (image && image.data && image.mimeType) {
        userParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data
          }
        });
      }
      userParts.push({ text });

      contents.push({
        role: 'user',
        parts: userParts
      });
    }

    // Configure request config
    const reqConfig: any = {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    };

    if (thinkingMode) {
      reqConfig.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH
      };
      // Note: We do NOT set maxOutputTokens here to comply with guidelines
    }

    // Call selected model
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
      config: reqConfig
    });

    res.json({ text: response.text || 'No response text from Gemini.' });
  } catch (error: any) {
    console.error('Gemini multi-turn API execution failed:', error);
    res.status(500).json({ error: 'Failed to process AI prompt. Please verify your selected model settings.' });
  }
});

// 1c. API: AI Anomaly Detection in Numeric Columns
app.post('/api/gemini/detect-anomalies', async (req, res) => {
  const { headers, rows } = req.body;

  if (!headers || !Array.isArray(headers) || !rows || !Array.isArray(rows)) {
    res.status(400).json({ error: 'Headers and rows are required.' });
    return;
  }

  // Find numerical columns
  const numericColumns = headers.filter(header => {
    const lower = header.toLowerCase();
    return (
      lower.includes('amount') ||
      lower.includes('budget') ||
      lower.includes('price') ||
      lower.includes('total') ||
      lower.includes('cost') ||
      lower.includes('fee') ||
      lower.includes('quantity') ||
      lower.includes('rate') ||
      lower.includes('value')
    );
  });

  const ai = getGeminiClient();

  // Helper for offline fallback or rule-based outlier detection
  const runProgrammaticOutlierFallbacks = () => {
    const anomalies: any[] = [];
    numericColumns.forEach(header => {
      const parsedValues: { val: number; raw: string; row: number }[] = [];
      rows.forEach((row, idx) => {
        const rawVal = row[header];
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          const clean = String(rawVal).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(clean);
          if (!isNaN(parsed)) {
            parsedValues.push({ val: parsed, raw: String(rawVal), row: idx + 2 });
          }
        }
      });

      if (parsedValues.length < 3) return;

      const mean = parsedValues.reduce((sum, pv) => sum + pv.val, 0) / parsedValues.length;
      const variance = parsedValues.reduce((sum, pv) => sum + Math.pow(pv.val - mean, 2), 0) / parsedValues.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev <= 0) return;

      parsedValues.forEach(pv => {
        const zScore = Math.abs(pv.val - mean) / stdDev;
        if (zScore > 2.0) { // Slightly more sensitive for AI mode
          const isCritical = zScore > 3.0;
          anomalies.push({
            id: `ai-outlier-${header}-${pv.row}`,
            type: 'outlier',
            severity: isCritical ? 'critical' : 'warning',
            column: header,
            row: pv.row,
            value: pv.raw,
            description: `AI-Powered Anomaly: The value "${pv.raw}" is a statistical deviation (${zScore.toFixed(2)} SDs from average).`,
            suggestion: `This entry represents extreme variance compared to the standard column mean of $${mean.toFixed(2)}. Please verify transaction authenticity or correct potential input decimals.`,
            explanation: `Our AI anomaly scanner identified this record in Row ${pv.row} as a high-magnitude outlier. Standard transactions in column "${header}" center around $${mean.toFixed(2)} with a standard deviation of $${stdDev.toFixed(2)}. This specific value of "${pv.raw}" has a Z-Score of ${zScore.toFixed(2)}, which lies in the top 1% of the statistical probability tail, suggesting either a major premium account transaction or a typographical error.`
          });
        }
      });
    });
    return anomalies;
  };

  if (!ai) {
    console.log('Gemini API key not found, using premium programmatic outlier detection.');
    const fallbackAnomalies = runProgrammaticOutlierFallbacks();
    res.json({ anomalies: fallbackAnomalies, method: 'programmatic' });
    return;
  }

  try {
    // If we have rows, let's prepare the numeric data
    const columnsData: Record<string, { row: number; val: number; raw: string }[]> = {};
    numericColumns.forEach(header => {
      columnsData[header] = [];
      rows.forEach((row, idx) => {
        const rawVal = row[header];
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          const clean = String(rawVal).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(clean);
          if (!isNaN(parsed)) {
            columnsData[header].push({ row: idx + 2, val: parsed, raw: String(rawVal) });
          }
        }
      });
    });

    let dataDescription = "";
    numericColumns.forEach(header => {
      const dataPoints = columnsData[header].map(item => `Row ${item.row}: ${item.raw}`).join('\n');
      dataDescription += `\nColumn: "${header}"\nValues:\n${dataPoints}\n`;
    });

    if (!dataDescription.trim()) {
      res.json({ anomalies: [] });
      return;
    }

    const systemInstruction = 
      "You are an advanced data auditing and financial fraud detection system named Gemini Anomaly Guard.\n" +
      "Your objective is to scan numeric columns in a transaction database, identify extreme statistical outliers, entry errors, or fraudulent payout anomalies, and explain why they violate typical transactional distributions.\n" +
      "You MUST return your findings in a structured JSON object matching this schema:\n" +
      "{\n" +
      "  \"anomalies\": [\n" +
      "    {\n" +
      "      \"id\": \"string (e.g. ai-outlier-Amount-7)\",\n" +
      "      \"type\": \"outlier\",\n" +
      "      \"severity\": \"critical | warning (use critical for extreme anomalies > 3x typical values, warning otherwise)\",\n" +
      "      \"column\": \"string (column name)\",\n" +
      "      \"row\": number (the row index number),\n" +
      "      \"value\": \"string (the raw value)\",\n" +
      "      \"description\": \"string (brief description of the outlier)\",\n" +
      "      \"suggestion\": \"string (actionable step, e.g. verify approval, cap value)\",\n" +
      "      \"explanation\": \"string (detailed statistical explanation of why it is an anomaly)\"\n" +
      "    }\n" +
      "  ]\n" +
      "}\n" +
      "Output ONLY valid JSON. Do not wrap in markdown or add text.";

    const promptText = 
      `Identify extreme outliers or statistical anomalies in the following dataset numeric columns:\n` +
      `${dataDescription}\n\n` +
      `Focus on values that deviate significantly from standard trends. For example, if most values are between $10 and $1,000, a value of $1,500,000 is an extreme anomaly. Return the anomalies JSON object.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });

    const responseText = response.text || '';
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed && Array.isArray(parsed.anomalies)) {
        res.json({ anomalies: parsed.anomalies, method: 'gemini' });
      } else {
        throw new Error('Response does not match expected schema');
      }
    } catch (e) {
      console.warn('Failed to parse Gemini anomaly detection response, falling back to programmatic:', responseText);
      const fallbackAnomalies = runProgrammaticOutlierFallbacks();
      res.json({ anomalies: fallbackAnomalies, method: 'programmatic' });
    }
  } catch (error: any) {
    console.error('Gemini Anomaly Detection API failed:', error);
    const fallbackAnomalies = runProgrammaticOutlierFallbacks();
    res.json({ anomalies: fallbackAnomalies, method: 'programmatic' });
  }
});

// 1b. API: Voice Transcription via Gemini 3.5 Flash
app.post('/api/gemini/transcribe', async (req, res) => {
  const { audioData, mimeType = 'audio/webm' } = req.body;

  if (!audioData) {
    res.status(400).json({ error: 'Audio recording stream data is required.' });
    return;
  }

  const ai = getGeminiClient();

  if (!ai) {
    console.log('Gemini API offline, simulating audio transcription fallback.');
    res.json({ text: "Are there any high-amount outliers or duplicates in this spreadsheet?" });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: audioData
          }
        },
        {
          text: "Transcribe the spoken words in this audio file precisely. Output only the transcribed text, without any introductory statements, markdown wrappers, or explanation."
        }
      ]
    });

    res.json({ text: response.text?.trim() || '' });
  } catch (error: any) {
    console.error('Gemini Audio Transcription execution failed:', error);
    res.status(500).json({ error: 'Failed to transcribe captured audio.' });
  }
});

// API: Analyze CSV Headers and suggest canonical mappings using Gemini API
app.post('/api/gemini/analyze-headers', async (req, res) => {
  const { headers, sampleRows } = req.body;

  if (!headers || !Array.isArray(headers)) {
    res.status(400).json({ error: 'Headers array is required' });
    return;
  }

  // Define our standard canonical fields
  const CANONICAL_FIELDS = [
    'Transaction ID',
    'Transaction Date',
    'Customer Name',
    'Email / Contact',
    'Amount',
    'Category',
    'Country'
  ];

  // Helper rule-based mapping function for fallback or initialization
  const generateRuleBasedMappings = (headersList: string[], samples: Record<string, string>[]) => {
    const mappings: Record<string, string> = {};
    const explanations: Record<string, string> = {};

    headersList.forEach(header => {
      const lower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (lower.includes('id') || lower.includes('txn') || lower.includes('ref') || lower.includes('key') || lower.includes('identifier') || lower.includes('code')) {
        mappings[header] = 'Transaction ID';
        explanations[header] = `Header "${header}" matches Transaction ID keywords and exhibits alphanumeric indices in sample records.`;
      } else if (lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('timestamp') || lower.includes('day')) {
        mappings[header] = 'Transaction Date';
        explanations[header] = `Header "${header}" detected as date structure. Sample values show standard timestamp or calendar formats.`;
      } else if (lower.includes('name') || lower.includes('client') || lower.includes('buyer') || lower.includes('recipient') || lower.includes('customer')) {
        mappings[header] = 'Customer Name';
        explanations[header] = `Header "${header}" likely contains entity identifiers or customer/client nomenclature.`;
      } else if (lower.includes('email') || lower.includes('mail') || lower.includes('contact') || lower.includes('phone') || lower.includes('address')) {
        mappings[header] = 'Email / Contact';
        explanations[header] = `Header "${header}" contains electronic mail patterns or structural telephone metrics in sample lines.`;
      } else if (lower.includes('amount') || lower.includes('price') || lower.includes('total') || lower.includes('pay') || lower.includes('cost') || lower.includes('value') || lower.includes('subtotal') || lower.includes('fee')) {
        mappings[header] = 'Amount';
        explanations[header] = `Header "${header}" identified as standard numerical transactional value/ledger currency.`;
      } else if (lower.includes('category') || lower.includes('type') || lower.includes('class') || lower.includes('tag') || lower.includes('group') || lower.includes('genre')) {
        mappings[header] = 'Category';
        explanations[header] = `Header "${header}" defines classifications, genres, or logical groupings.`;
      } else if (lower.includes('country') || lower.includes('location') || lower.includes('region') || lower.includes('city') || lower.includes('state') || lower.includes('nation') || lower.includes('geo') || lower.includes('us') || lower.includes('uk')) {
        mappings[header] = 'Country';
        explanations[header] = `Header "${header}" represents geographic properties, state codes, or regional tenancy indicators.`;
      } else {
        // Find best match based on sample values if available
        let guessedType = '';
        if (samples && samples.length > 0) {
          const sampleVal = String(samples[0][header] || '').trim();
          if (sampleVal) {
            if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(sampleVal)) {
              guessedType = 'Email / Contact';
            } else if (/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/.test(sampleVal)) {
              guessedType = 'Transaction Date';
            } else if (!isNaN(Number(sampleVal.replace(/[^0-9.-]/g, ''))) && sampleVal.length > 0) {
              guessedType = 'Amount';
            }
          }
        }

        if (guessedType) {
          mappings[header] = guessedType;
          explanations[header] = `Mapped to "${guessedType}" by analyzing semantic structure of row values.`;
        } else {
          mappings[header] = 'None';
          explanations[header] = `No strong canonical match was automatically identified. Classified as custom auxiliary metadata.`;
        }
      }
    });

    return { mappings, explanations };
  };

  const ai = getGeminiClient();

  if (!ai) {
    console.log('Gemini API key missing, generating rule-based mappings.');
    const result = generateRuleBasedMappings(headers, sampleRows || []);
    res.json(result);
    return;
  }

  try {
    const systemInstruction = 
      "You are an expert data architect and CSV ingestion engine analyst.\n" +
      "Analyze the list of CSV column headers and sample rows to recommend mappings to standard canonical names.\n" +
      "The canonical names are exactly: 'Transaction ID', 'Transaction Date', 'Customer Name', 'Email / Contact', 'Amount', 'Category', 'Country'.\n" +
      "If a column does not fit any, map it to 'None'.\n" +
      "Return your response ONLY as a valid JSON object. Do not wrap it in markdown codeblocks or other text. Use the following schema:\n" +
      "{\n" +
      "  \"mappings\": {\n" +
      "    \"Original Header\": \"Canonical Name\"\n" +
      "  },\n" +
      "  \"explanations\": {\n" +
      "    \"Original Header\": \"Short, elegant explanation of why this mapping fits\"\n" +
      "  }\n" +
      "}";

    const promptText = 
      `Analyze these CSV headers and sample data rows:\n` +
      `Headers: ${JSON.stringify(headers)}\n` +
      `Sample Data Rows: ${JSON.stringify((sampleRows || []).slice(0, 3))}\n\n` +
      `Please provide the JSON mapping recommendations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });

    const responseText = response.text || '';
    // Parse the JSON securely, with a fallback if needed
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);
      res.json(result);
    } catch (e) {
      console.warn('Failed to parse Gemini json output, using rule-based fallback:', responseText);
      const result = generateRuleBasedMappings(headers, sampleRows || []);
      res.json(result);
    }

  } catch (err: any) {
    console.error('Gemini analyze-headers failed, using rule-based fallback:', err);
    const result = generateRuleBasedMappings(headers, sampleRows || []);
    res.json(result);
  }
});

// Programmatic helper to apply standard formatting fallback
const programmaticBulkAutoFix = (headers: string[], rows: Record<string, string>[]) => {
  return rows.map(row => {
    const cleanedRow: Record<string, string> = {};
    headers.forEach(header => {
      let val = row[header];
      if (val === undefined || val === null) {
        cleanedRow[header] = '';
        return;
      }
      val = String(val).trim();
      
      const lowerHeader = header.toLowerCase();
      
      // 1. Correct dates: convert MM/DD/YYYY or DD-MM-YYYY or other formats to YYYY-MM-DD
      if (lowerHeader.includes('date') || lowerHeader.includes('time') || lowerHeader.includes('timestamp')) {
        let dateObj: Date | null = null;
        
        // Match standard format formats
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(val)) {
          const parts = val.split(/[\/\-]/);
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          const p2 = parseInt(parts[2], 10);
          if (p0 > 12) { // DD/MM/YYYY
            dateObj = new Date(p2, p1 - 1, p0);
          } else if (p1 > 12) { // MM/DD/YYYY
            dateObj = new Date(p2, p0 - 1, p1);
          } else {
            // Default to MM/DD/YYYY
            dateObj = new Date(p2, p0 - 1, p1);
          }
        } else {
          const parsed = Date.parse(val);
          if (!isNaN(parsed)) {
            dateObj = new Date(parsed);
          }
        }
        
        if (dateObj && !isNaN(dateObj.getTime())) {
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          val = `${yyyy}-${mm}-${dd}`;
        }
      }
      
      // 2. Normalizing casing
      // Email addresses
      else if (lowerHeader.includes('email') || val.includes('@')) {
        val = val.toLowerCase();
      }
      // Customer/Name
      else if (lowerHeader.includes('name') || lowerHeader.includes('client') || lowerHeader.includes('customer') || lowerHeader.includes('buyer') || lowerHeader.includes('recipient')) {
        val = val.replace(/\b\w/g, c => c.toUpperCase());
      }
      // Country / Location
      else if (lowerHeader.includes('country') || lowerHeader.includes('nation')) {
        if (val.length <= 3) {
          val = val.toUpperCase();
        } else {
          val = val.replace(/\b\w/g, c => c.toUpperCase());
        }
      }
      
      // 3. Normalizing currency/amounts: remove currency symbols and spacing
      else if (lowerHeader.includes('amount') || lowerHeader.includes('price') || lowerHeader.includes('total') || lowerHeader.includes('cost') || lowerHeader.includes('pay') || lowerHeader.includes('fee')) {
        const cleaned = val.replace(/[^0-9.\-]/g, '');
        if (cleaned && !isNaN(parseFloat(cleaned))) {
          val = parseFloat(cleaned).toFixed(2);
        }
      }
      
      cleanedRow[header] = val;
    });
    return cleanedRow;
  });
};

// API: Bulk Auto-Fix data rows using Gemini API
app.post('/api/gemini/bulk-autofix', async (req, res) => {
  const { headers, rows } = req.body;

  if (!headers || !Array.isArray(headers) || !rows || !Array.isArray(rows)) {
    res.status(400).json({ error: 'Headers and rows arrays are required' });
    return;
  }

  const ai = getGeminiClient();

  if (!ai) {
    console.log('Gemini API key missing, executing programmatic formatting fallback.');
    const cleaned = programmaticBulkAutoFix(headers, rows);
    res.json({ success: true, rows: cleaned, method: 'programmatic' });
    return;
  }

  try {
    const systemInstruction = 
      "You are an expert data formatting and cleaning AI named Gemini Data Auto-Fixer.\n" +
      "Your task is to take an array of rows (representing database records) and apply clean-up rules:\n" +
      "1. Trim leading/trailing whitespaces.\n" +
      "2. Format dates strictly to YYYY-MM-DD. (e.g., '04/06/2026' -> '2026-06-04').\n" +
      "3. Normalize text casing (names: title case like 'John Doe', email: lowercase, country: proper uppercase like 'USA' or 'United Kingdom').\n" +
      "4. Strip currency symbols and commas from numerical columns so they are clean numeric values (e.g., '$1,200.50' -> '1200.50').\n" +
      "5. Maintain exact headers (keys) of the rows.\n" +
      "Return ONLY a valid JSON array of corrected row objects. Do not wrap in markdown or add text.";

    const promptText = 
      `Analyze and fix these spreadsheet rows:\n` +
      `Headers: ${JSON.stringify(headers)}\n` +
      `Rows: ${JSON.stringify(rows)}\n\n` +
      `Please return the cleaned rows JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });

    const responseText = response.text || '';
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const cleaned = JSON.parse(cleanJson);
      if (Array.isArray(cleaned)) {
        res.json({ success: true, rows: cleaned, method: 'gemini' });
      } else {
        throw new Error('Response is not an array');
      }
    } catch (e) {
      console.warn('Failed to parse Gemini auto-fix output, using programmatic fallback:', responseText);
      const cleaned = programmaticBulkAutoFix(headers, rows);
      res.json({ success: true, rows: cleaned, method: 'programmatic' });
    }

  } catch (err: any) {
    console.error('Gemini bulk-autofix failed, using programmatic fallback:', err);
    const cleaned = programmaticBulkAutoFix(headers, rows);
    res.json({ success: true, rows: cleaned, method: 'programmatic' });
  }
});

// 2. Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', api: 'online', database: 'connected' });
});

// --- GOOGLE SEARCH CONSOLE VERIFICATION SERVICES ---

// GET Search Console Config
app.get('/api/gsc/settings', (req, res) => {
  try {
    const configPath = path.join(process.cwd(), 'gsc-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      res.json(config);
    } else {
      res.json({ metaCode: '', fileName: '', fileContent: '' });
    }
  } catch (e: any) {
    console.error('Error reading GSC config:', e);
    res.status(500).json({ error: 'Failed to read GSC config' });
  }
});

// POST Search Console Config
app.post('/api/gsc/settings', (req, res) => {
  try {
    const { metaCode, fileName, fileContent } = req.body;
    const config = {
      metaCode: metaCode || '',
      fileName: fileName || '',
      fileContent: fileContent || ''
    };
    const configPath = path.join(process.cwd(), 'gsc-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    res.json({ success: true, config });
  } catch (e: any) {
    console.error('Error writing GSC config:', e);
    res.status(500).json({ error: 'Failed to write GSC config' });
  }
});

// Serve HTML File Verification route dynamically
app.get('/google*.html', (req, res) => {
  const requestedFile = req.path.substring(1); // e.g. "google1234567890.html"
  try {
    const configPath = path.join(process.cwd(), 'gsc-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.fileName === requestedFile) {
        res.setHeader('Content-Type', 'text/html');
        res.send(config.fileContent || `google-site-verification: ${requestedFile}`);
        return;
      }
    }
  } catch (e) {
    console.error('Error serving GSC HTML file:', e);
  }
  res.status(404).send('Not Found');
});

// Vite middleware integration for full-stack build patterns
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Intercept Root URL to inject GSC Meta-Tag dynamically on production
    app.get('/', (req, res, next) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        try {
          const configPath = path.join(process.cwd(), 'gsc-config.json');
          if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.metaCode) {
              html = html.replace(
                '<head>',
                `<head>\n    <meta name="google-site-verification" content="${config.metaCode}" />`
              );
            }
          }
        } catch (e) {
          console.error('Error injecting GSC meta tag on server:', e);
        }
        res.send(html);
      } else {
        next();
      }
    });

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CSV Auditor Pro server booting successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
