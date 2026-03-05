import { useEffect, useCallback } from 'react';
import { useExamStore } from '@/stores/examStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAntiCheat(onAutoSubmit: () => void) {
  const { sessionId, incrementViolations } = useExamStore();

  const handleViolation = useCallback(async () => {
    const count = incrementViolations();
    
    if (sessionId) {
      await supabase
        .from('exam_sessions')
        .update({ violations: count })
        .eq('id', sessionId);
    }

    if (count >= 3) {
      toast.error('Exam auto-submitted due to multiple tab switches.');
      onAutoSubmit();
    } else {
      toast.warning(`Warning: Tab switch detected (${count}/3). 3 violations will auto-submit your exam.`);
    }
  }, [sessionId, incrementViolations, onAutoSubmit]);

  useEffect(() => {
    // Disable copy/paste/cut/select-all
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
      // Disable dev tools
      if (e.key === 'F12') e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    // Disable right-click
    const handleContextMenu = (e: Event) => e.preventDefault();

    // Disable text selection
    const handleSelectStart = (e: Event) => e.preventDefault();

    // Tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleViolation]);
}
