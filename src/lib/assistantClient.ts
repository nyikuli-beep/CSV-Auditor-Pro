/**
 * CSV Auditor Pro - Frontend Assistant Client (Phase 2)
 * Secure communication layer between Floating Assistant UI and backend Firebase + Gemini service.
 */

import { auth } from '../firebase';
import { CSVAuditorAIRequest, CSVAuditorAIResponse } from '../types/assistant';

export class AssistantClient {
  /**
   * Sends a user query along with verified workspace and dataset context to the secure backend.
   */
  public static async sendChat(request: CSVAuditorAIRequest, activeFileContext?: any): Promise<CSVAuditorAIResponse> {
    const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      // Get Firebase auth token if user is signed in
      const currentUser = auth.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const payload = {
        ...request,
        requestId,
        fileContext: activeFileContext ? {
          id: activeFileContext.id || request.datasetId,
          name: activeFileContext.name || request.analysisContext?.fileName,
          rows: activeFileContext.rows,
          headers: activeFileContext.headers,
          score: activeFileContext.score,
          issues: activeFileContext.issues
        } : undefined
      };

      const response = await fetch('/api/ai/assistant/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.answer || `Server responded with status ${response.status}`;

        return {
          success: false,
          answer: `I was unable to complete your audit request: ${errorMessage}`,
          grounding: 'error',
          requestId,
          timestamp: new Date().toISOString(),
          error: errorMessage
        };
      }

      const data: CSVAuditorAIResponse = await response.json();
      return data;
    } catch (err: any) {
      console.error('[AssistantClient Error]:', err);
      return {
        success: false,
        answer: 'A network error occurred while communicating with the audit service. Please try again.',
        grounding: 'error',
        requestId,
        timestamp: new Date().toISOString(),
        error: err.message || 'Network request failed'
      };
    }
  }
}
