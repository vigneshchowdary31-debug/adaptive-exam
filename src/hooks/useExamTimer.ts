import { useEffect, useRef } from 'react';
import { useExamStore } from '@/stores/examStore';

export function useExamTimer(onTimeUp: () => void) {
  const { timeRemaining, setTimeRemaining, isFinished } = useExamStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isFinished) return;

    intervalRef.current = setInterval(() => {
      const { timeRemaining: current } = useExamStore.getState();
      if (current <= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeRemaining(0);
        onTimeUp();
      } else {
        setTimeRemaining(current - 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isFinished, onTimeUp, setTimeRemaining]);

  return timeRemaining;
}
