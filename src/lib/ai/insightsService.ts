/**
 * CSV Auditor Pro - AI Insights Service (Phase 1)
 * Dedicated service layer for automated data quality and dataset insights.
 * 
 * Phase 1 Status:
 * - Decoupled from legacy RAG and Conversational Auditor.
 * - Legacy hard-coded templates and fake analysis removed.
 * - Returns a clean neutral upgrade state while Phase 2 Gemini Reasoning is prepared.
 */

import { AIInsightsRequest, AIInsightsResponse, ReasoningEngineProvider, AI_ENGINE_UPGRADE_MESSAGE } from './types';

export class AIInsightsService {
  private static instance: AIInsightsService | null = null;
  private reasoningProvider: ReasoningEngineProvider | null = null;

  private constructor() {}

  public static getInstance(): AIInsightsService {
    if (!AIInsightsService.instance) {
      AIInsightsService.instance = new AIInsightsService();
    }
    return AIInsightsService.instance;
  }

  /**
   * Register a reasoning provider (Used in Phase 2)
   */
  public setReasoningProvider(provider: ReasoningEngineProvider): void {
    this.reasoningProvider = provider;
  }

  /**
   * Generates AI Insights for the current dataset context.
   */
  public async generateInsights(request: AIInsightsRequest): Promise<AIInsightsResponse> {
    // If a Phase 2 reasoning provider is attached and available, delegate to it
    if (this.reasoningProvider && this.reasoningProvider.isAvailable() && this.reasoningProvider.generateInsights) {
      return this.reasoningProvider.generateInsights(request);
    }

    // Phase 1 Clean Foundation: Fail gracefully with neutral upgrade state.
    // Never return fabricated dataset stats or canned answers.
    return {
      id: `insight_${Date.now()}`,
      insightType: request.insightType,
      content: AI_ENGINE_UPGRADE_MESSAGE,
      status: 'upgrading',
      citations: [
        { type: 'system', label: 'AI Architecture Phase 1 Reset' }
      ],
      generatedAt: new Date().toISOString()
    };
  }
}

export const aiInsightsService = AIInsightsService.getInstance();
