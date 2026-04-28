'use client';

// ═══════════════════════════════════════════════════════════════════════
// XuperStream - useChannelValidation Hook
// Validación reactiva de canales con progreso en tiempo real
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import type { M3UChannel } from '@/lib/m3uParser';
import {
  validateChannelsBatch,
  quickValidatePlaylist,
  getOnlineChannels,
  getValidationStats,
  type ValidationResult,
  type ValidationProgress,
  type ChannelStatus,
} from '@/lib/channelValidator';

export type ValidationStage = 'idle' | 'quick-check' | 'validating' | 'done' | 'error';

export interface UseChannelValidationReturn {
  stage: ValidationStage;
  progress: ValidationProgress;
  results: ValidationResult[];
  onlineChannels: M3UChannel[];
  stats: ReturnType<typeof getValidationStats>;
  isRunning: boolean;

  startValidation: (channels: M3UChannel[], options?: { concurrency?: number }) => Promise<void>;
  quickCheck: (channels: M3UChannel[], sampleSize?: number) => Promise<boolean>;
  stopValidation: () => void;
  reset: () => void;
}

export function useChannelValidation(): UseChannelValidationReturn {
  const [stage, setStage] = useState<ValidationStage>('idle');
  const [progress, setProgress] = useState<ValidationProgress>({
    total: 0,
    checked: 0,
    online: 0,
    offline: 0,
    errors: 0,
    percentage: 0,
  });
  const [results, setResults] = useState<ValidationResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const onlineChannels = getOnlineChannels(results);
  const stats = getValidationStats(results);
  const isRunning = stage === 'quick-check' || stage === 'validating';

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStage('idle');
    setProgress({
      total: 0,
      checked: 0,
      online: 0,
      offline: 0,
      errors: 0,
      percentage: 0,
    });
    setResults([]);
  }, []);

  const stopValidation = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStage((prev) => (prev === 'validating' || prev === 'quick-check' ? 'done' : prev));
  }, []);

  const startValidation = useCallback(
    async (channels: M3UChannel[], options?: { concurrency?: number }) => {
      // Cancel any running validation
      if (abortRef.current) abortRef.current.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setStage('validating');
      setProgress({
        total: channels.length,
        checked: 0,
        online: 0,
        offline: 0,
        errors: 0,
        percentage: 0,
      });
      setResults([]);

      try {
        const validationResults = await validateChannelsBatch(channels, {
          concurrency: options?.concurrency || 8,
          onProgress: (p) => {
            if (controller.signal.aborted) return;
            setProgress({ ...p });
          },
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setResults(validationResults);
          setStage('done');
        }
      } catch {
        if (!controller.signal.aborted) {
          setStage('error');
        }
      } finally {
        abortRef.current = null;
      }
    },
    []
  );

  const quickCheck = useCallback(
    async (channels: M3UChannel[], sampleSize: number = 5): Promise<boolean> => {
      setStage('quick-check');
      setProgress({
        total: channels.length,
        checked: 0,
        online: 0,
        offline: 0,
        errors: 0,
        percentage: 0,
      });

      try {
        const result = await quickValidatePlaylist(channels, sampleSize);
        setStage('idle');
        return result.valid;
      } catch {
        setStage('error');
        return false;
      }
    },
    []
  );

  return {
    stage,
    progress,
    results,
    onlineChannels,
    stats,
    isRunning,
    startValidation,
    quickCheck,
    stopValidation,
    reset,
  };
}
