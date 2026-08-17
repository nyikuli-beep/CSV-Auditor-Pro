import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  AssistantMessage,
  AssistantPageContext,
  AssistantDatasetContext,
  AssistantRecommendationContext
} from '../types/assistant';

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
  setDatasetContext: (ctx: AssistantDatasetContext | null) => void;
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

  // Initialize messages from session storage
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        return JSON.parse(saved);
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

  const [datasetContext, setDatasetContext] = useState<AssistantDatasetContext | null>(null);
  const [recommendationContext, setRecommendationContext] = useState<AssistantRecommendationContext | null>(null);

  const openAssistant = useCallback((initialPrompt?: string) => {
    setIsOpen(true);
    setIsMinimized(false);
    if (initialPrompt && initialPrompt.trim()) {
      // If an initial prompt was passed, we can handle it
      setTimeout(() => {
        sendMessage(initialPrompt.trim());
      }, 50);
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
    if (!content.trim()) return;

    const userMsg: AssistantMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'complete'
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    // Phase 1: Clean Foundation & Context Verification Shell
    // DO NOT connect Gemini yet or generate hard-coded responses.
    // Simulate immediate readiness and confirmation of context capture.
    setTimeout(() => {
      const assistantMsg: AssistantMessage = {
        id: `msg_asst_${Date.now()}`,
        role: 'assistant',
        content: `CSV Auditor AI is active in Phase 1 mode. Current page: "${pageContext.page}". Dataset context: ${datasetContext ? `"${datasetContext.fileName}" (${datasetContext.rowCount} rows)` : 'No active CSV'}. Real-time Gemini reasoning intelligence will connect in Phase 2.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'complete'
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsProcessing(false);
    }, 400);
  }, [pageContext, datasetContext]);

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
