/**
 * CSV Auditor Pro - Authoritative Frontend Assistant Client
 * Communicates exclusively with the authoritative POST /api/chat endpoint.
 */

import { auth } from '../firebase';
import { CSVAuditorAIRequest, CSVAuditorAIResponse } from '../types/assistant';

export class AssistantClient {
  /**
   * Sends a user query along with verified workspace and dataset context to the secure /api/chat backend.
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

      // Build authoritative CSV and file context
      const fileName = activeFileContext?.name || request.analysisContext?.fileName || 'dataset.csv';
      const rowCount = activeFileContext?.rows ? activeFileContext.rows.length : (request.analysisContext?.rowCount || 0);
      const auditFindings = activeFileContext?.issues || [];
      const score = activeFileContext?.score ?? request.analysisContext?.score;
      const headersList = activeFileContext?.headers || (activeFileContext?.rows && activeFileContext.rows.length > 0 ? Object.keys(activeFileContext.rows[0]) : []);

      const payload = {
        message: request.message,
        requestId,
        csvContext: {
          fileName,
          rowCount,
          headers: headersList,
          score,
          auditFindings
        },
        fileContext: activeFileContext ? {
          id: activeFileContext.id || request.datasetId,
          name: fileName,
          rows: activeFileContext.rows ? activeFileContext.rows.slice(0, 100) : [],
          headers: headersList,
          score,
          issues: auditFindings
        } : undefined,
        pageContext: request.pageContext,
        recommendationContext: request.recommendationContext,
        conversationHistory: request.conversationHistory,
        analysisContext: request.analysisContext
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const rawErrMsg = typeof errorData.error === 'object' 
          ? errorData.error?.message 
          : (errorData.error || errorData.answer || errorData.message || `HTTP ${response.status}`);
        
        console.warn(`[AssistantClient] Server error ${response.status}:`, rawErrMsg);

        return {
          success: false,
          answer: typeof errorData.answer === 'string' && errorData.answer.trim()
            ? errorData.answer
            : `The CSV Auditor AI could not complete this request at this time (${response.status}). Please verify the dataset and try again.`,
          grounding: 'error',
          requestId,
          timestamp: new Date().toISOString(),
          error: rawErrMsg
        };
      }

      const data: CSVAuditorAIResponse = await response.json();
      return data;
    } catch (err: any) {
      console.error('[AssistantClient Error]:', err?.message || err);
      return {
        success: false,
        answer: 'A network communication error occurred while contacting the CSV Auditor AI service. Please check your network connection.',
        grounding: 'error',
        requestId,
        timestamp: new Date().toISOString(),
        error: err?.message || 'Network request failed'
      };
    }
  }
}
