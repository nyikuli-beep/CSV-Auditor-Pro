/**
 * CSV Auditor Pro - Centralized AI Model Configuration
 * Centralizes model identifiers and parameters so they are not hard-coded across multiple files.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.7-flash';

export const AI_MODELS = {
  DEFAULT: DEFAULT_GEMINI_MODEL,
  FLASH_3_7: 'gemini-3.7-flash',
} as const;

export interface ModelGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export const DEFAULT_GENERATION_CONFIG: ModelGenerationConfig = {
  temperature: 0.2,
  topP: 0.95,
  maxOutputTokens: 2048,
};
