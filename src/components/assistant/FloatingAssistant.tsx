import React, { useEffect } from 'react';
import { FloatingAssistantButton } from './FloatingAssistantButton';
import { FloatingChatPanel } from './FloatingChatPanel';
import { useAssistant } from '../../context/AssistantContext';

interface FloatingAssistantProps {
  isDarkMode: boolean;
  accentClass?: string;
  onNavigate?: (tabId: string) => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  isDarkMode,
  accentClass,
  onNavigate
}) => {
  const { isOpen, closeAssistant } = useAssistant();

  // Keyboard shortcut: Escape to close assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeAssistant();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeAssistant]);

  return (
    <>
      <FloatingChatPanel 
        isDarkMode={isDarkMode} 
        accentClass={accentClass} 
        onNavigate={onNavigate}
      />
      <FloatingAssistantButton 
        isDarkMode={isDarkMode} 
        accentClass={accentClass} 
      />
    </>
  );
};
