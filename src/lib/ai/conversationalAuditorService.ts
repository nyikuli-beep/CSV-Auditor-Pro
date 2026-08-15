/**
 * CSV Auditor Pro - Conversational Auditor Service (Phase 1)
 * Dedicated service layer for interactive conversational audit chat.
 * 
 * Phase 1 Status:
 * - Decoupled from legacy RAG, mock agent orchestrators, and AI Insights.
 * - Legacy hard-coded templates and fake analysis removed.
 * - Returns a clean neutral upgrade state while Phase 2 Gemini Reasoning is prepared.
 */

import { 
  ConversationalAuditorRequest, 
  ConversationalAuditorResponse, 
  ConversationalAuditorStreamCallbacks, 
  ConversationalAuditorMeta,
  ReasoningEngineProvider,
  AI_ENGINE_UPGRADE_MESSAGE 
} from './types';

export class ConversationalAuditorService {
  private static instance: ConversationalAuditorService | null = null;
  private reasoningProvider: ReasoningEngineProvider | null = null;

  private constructor() {}

  public static getInstance(): ConversationalAuditorService {
    if (!ConversationalAuditorService.instance) {
      ConversationalAuditorService.instance = new ConversationalAuditorService();
    }
    return ConversationalAuditorService.instance;
  }

  /**
   * Register a reasoning provider (Used in Phase 2)
   */
  public setReasoningProvider(provider: ReasoningEngineProvider): void {
    this.reasoningProvider = provider;
  }

  /**
   * Streams a conversational audit response.
   */
  public async streamChat(
    request: ConversationalAuditorRequest,
    callbacks: ConversationalAuditorStreamCallbacks
  ): Promise<void> {
    const requestId = `req_${Date.now()}`;

    // If a Phase 2 reasoning provider is attached and available, delegate to it
    if (this.reasoningProvider && this.reasoningProvider.isAvailable() && this.reasoningProvider.streamConversation) {
      return this.reasoningProvider.streamConversation(request, callbacks);
    }

    // Phase 1 Clean Foundation: Emit metadata and the clear upgrade status.
    // Never return fabricated dataset stats or canned answers.
    const meta: ConversationalAuditorMeta = {
      requestId,
      model: request.model || 'gemini-3.7-flash',
      status: 'upgrading',
      citations: [
        { type: 'system', label: 'AI Architecture Phase 1 Reset' }
      ],
      intent: 'general',
      confidenceScore: 1.0
    };

    callbacks.onMeta(meta);

    // Stream the upgrade message
    callbacks.onChunk(AI_ENGINE_UPGRADE_MESSAGE);

    if (callbacks.onDone) {
      callbacks.onDone();
    }
  }

  /**
   * Non-streaming fallback for simple request/response flows.
   */
  public async chat(request: ConversationalAuditorRequest): Promise<ConversationalAuditorResponse> {
    let text = '';
    let metaResult: ConversationalAuditorMeta = {
      requestId: `req_${Date.now()}`,
      model: request.model || 'gemini-3.7-flash',
      status: 'upgrading',
      citations: [{ type: 'system', label: 'AI Architecture Phase 1 Reset' }]
    };

    await this.streamChat(request, {
      onMeta: (meta) => { metaResult = meta; },
      onChunk: (chunk) => { text += chunk; }
    });

    return {
      id: metaResult.requestId,
      content: text || AI_ENGINE_UPGRADE_MESSAGE,
      meta: metaResult,
      generatedAt: new Date().toISOString()
    };
  }
}

export const conversationalAuditorService = ConversationalAuditorService.getInstance();
