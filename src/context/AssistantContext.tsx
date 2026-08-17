import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import {
  AssistantMessage,
  AssistantPageContext,
  AssistantDatasetContext,
  AssistantRecommendationContext,
  CSVAuditorAIRequest,
  ConversationHistoryItem
} from '../types/assistant';
import { AssistantClient } from '../lib/assistantClient';

interface AssistantContextType {
  isOpen: boolean;
  isMinimized: boolean;
  openAssistant: (initialPrompt?: string) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  toggleMinimize: () => void;
  messages: AssistantMessage[];
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  pageContext: AssistantPageContext;
  setPageContext: (ctx: AssistantPageContext) => void;
  datasetContext: AssistantDatasetContext | null;
  setDatasetContext: (ctx: AssistantDatasetContext | null, rawFile?: any) => void;
  rawFileContext: any | null;
  recommendationContext: AssistantRecommendationContext | null;
  setRecommendationContext: (ctx: AssistantRecommendationContext | null) => void;
  isProcessing: boolean;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

const STORAGE_KEY_MESSAGES = 'csv_auditor_assistant_messages';

export const AssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);

  // Initialize messages from session storage
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any lingering 'sending' placeholder messages on reload
          return parsed.map((m: AssistantMessage) => ({
            ...m,
            status: m.status === 'sending' ? 'error' : m.status
          }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Sync to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  const [pageContext, setPageContext] = useState<AssistantPageContext>({
    page: 'dashboard',
    title: 'Dashboard'
  });

  const [datasetContext, setDatasetContextState] = useState<AssistantDatasetContext | null>(null);
  const [rawFileContext, setRawFileContext] = useState<any | null>(null);
  const [recommendationContext, setRecommendationContext] = useState<AssistantRecommendationContext | null>(null);

  const setDatasetContext = useCallback((ctx: AssistantDatasetContext | null, rawFile?: any) => {
    setDatasetContextState(ctx);
    if (rawFile !== undefined) {
      setRawFileContext(rawFile);
    }
  }, []);

  const openAssistant = useCallback((initialPrompt?: string) => {
    setIsOpen(true);
    setIsMinimized(false);
    if (initialPrompt && initialPrompt.trim()) {
      setTimeout(() => {
        sendMessage(initialPrompt.trim());
      }, 100);
    }
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleAssistant = useCallback(() => {
    setIsOpen(prev => !prev);
    setIsMinimized(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY_MESSAGES);
    } catch {
      // ignore
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = (content || '').trim();
    if (!trimmed) return;

    // Duplicate submission protection: if already processing, reject concurrent call
    if (isProcessingRef.current) {
      console.warn('[AssistantContext] Submission ignored: another request is in progress.');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `msg_user_${Date.now()}`;
    const asstMsgId = `msg_asst_${Date.now()}`;

    const userMsg: AssistantMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      timestamp: now,
      status: 'complete'
    };

    const pendingAsstMsg: AssistantMessage = {
      id: asstMsgId,
      role: 'assistant',
      content: '',
      timestamp: now,
      status: 'sending'
    };

    // Show user message and pending assistant loading state immediately
    setMessages(prev => [...prev, userMsg, pendingAsstMsg]);

    try {
      // Build conversation history (compact prior turns)
      const historyItems: ConversationHistoryItem[] = messages
        .filter(m => m.status === 'complete' && (m.role === 'user' || m.role === 'assistant'))
        .slice(-8)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

      const requestPayload: CSVAuditorAIRequest = {
        requestId: asstMsgId,
        message: trimmed,
        datasetId: datasetContext?.fileId,
        pageContext,
        recommendationContext,
        conversationHistory: historyItems,
        analysisContext: datasetContext
      };

      const result = await AssistantClient.sendChat(requestPayload, rawFileContext);

      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id === asstMsgId) {
            if (result.success) {
              return {
                ...msg,
                content: result.answer || 'Completed analysis.',
                status: 'complete',
                grounding: result.grounding || 'data-verified',
                source: result.source,
                analysisType: result.analysisType,
                evidence: result.evidence,
                suggestedFollowUps: result.suggestedFollowUps,
                error: undefined
              };
            } else {
              return {
                ...msg,
                content: result.answer || 'An error occurred while processing your audit request.',
                status: 'error',
                grounding: 'error',
                error: result.error || 'Request failed'
              };
            }
          }
          return msg;
        });
      });
    } catch (err: any) {
      console.error('[AssistantContext] Send message error:', err);
      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id === asstMsgId) {
            return {
              ...msg,
              content: 'A communication error occurred. Please check your connection and try again.',
              status: 'error',
              grounding: 'error',
              error: err?.message || 'Network error'
            };
          }
          return msg;
        });
      });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [messages, pageContext, datasetContext, recommendationContext, rawFileContext]);

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        isMinimized,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        toggleMinimize,
        messages,
        sendMessage,
        clearMessages,
        pageContext,
        setPageContext,
        datasetContext,
        setDatasetContext,
        rawFileContext,
        recommendationContext,
        setRecommendationContext,
        isProcessing
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = (): AssistantContextType => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};

