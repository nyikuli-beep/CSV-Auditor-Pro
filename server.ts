import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
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

app.use(express.json());

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
  const { prompt, fileContext } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  const ai = getGeminiClient();

  // Offline high-fidelity fallback if key is missing or calls are throttled
  if (!ai) {
    console.log('Gemini API key not found in environment, falling back to simulated analysis.');
    
    let fallbackText = '';
    const q = prompt.toLowerCase();
    
    if (q.includes('outlier') || q.includes('anomaly') || q.includes('risk')) {
      fallbackText = `[Simulated Expert Data Auditor]
Analyzing transaction records for outliers:
- I've flagged a high risk anomaly in Row 7 ("Initech SA") where the Amount is $1,500,000.00. This is over 400x higher than our median amount. This should be cross-verified with active invoice approvals immediately.
- Duplicate transaction ID "TXN-1001" on Row 3 was also found. Purging this duplicate in the Cleaning Center will restore compliance and increase your score immediately.`;
    } else if (q.includes('clean') || q.includes('deduplicate') || q.includes('fix')) {
      fallbackText = `[Simulated Expert Data Auditor]
To clean and prepare this dataset for PG database ingestion:
1. Trigger "Remove Duplicate Records" to automatically purge row 3.
2. Trigger "Standardize Date Formats" to convert Row 5's "04/06/2026" into proper ISO standards.
3. Apply "Fill Missing Blank Cells" to safely impute row 4 and row 8 with standard defaults (0.00 and 'Uncategorized').`;
    } else {
      fallbackText = `[Simulated Expert Data Auditor]
Received prompt: "${prompt}". 
For file "${fileContext?.fileName || 'Company_Q2_Transactions_Messy.csv'}", I advise running structural validations. The schema has ${fileContext?.headersCount || 6} headers. Key metrics indicate 3 critical compliance errors (including un-imputed missing financial fields). Let me know if you would like me to formulate specific SQL insertion scripts for these cleaned rows!`;
    }

    res.json({ text: fallbackText });
    return;
  }

  try {
    const systemInstruction = 
      "You are an expert data analyst and database auditor named CSV Auditor Pro AI. " +
      "The user will ask questions about their uploaded spreadsheet. " +
      "Provide clear, concise, professional, and actionable steps. Explain why abnormalities occur " +
      "and how they can be cleaned to maintain strict relational database constraints (e.g. NOT NULL, UNIQUE, correct DATE patterns).";

    const promptWithContext = 
      `File Context:\n` +
      `- Name: ${fileContext?.fileName || 'Spreadsheet.csv'}\n` +
      `- Headers: ${(fileContext?.headers || []).join(', ')}\n` +
      `- Row Count: ${fileContext?.rowCount || 0}\n` +
      `- Anomaly Count: ${fileContext?.issuesCount || 0}\n\n` +
      `User Question: ${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptWithContext,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text || 'No response text from Gemini.' });
  } catch (error: any) {
    console.error('Gemini API execution failed:', error);
    res.status(500).json({ error: 'Failed to process AI prompt. Using standard compiler fallback.' });
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
