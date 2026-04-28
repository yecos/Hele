'use client';

// ═══════════════════════════════════════════════════════════════════════
// XuperStream - useChannelSurfing Hook
// Navegación tipo TV (zapping) con flechas, auto-hide y overlay
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import type { M3UChannel } from '@/lib/m3uParser';
import { getChannelExtendedInfo } from '@/lib/channelInfo';

export interface SurfingState {
  isSurfing: boolean;
  currentIndex: number;
  currentChannel: M3UChannel | null;
  channelInfo: ReturnType<typeof getChannelExtendedInfo> | null;
  showOverlay: boolean;
  overlayTimer: number;
  totalChannels: number;
}

export interface UseChannelSurfingOptions {
  channels: M3UChannel[];
  initialIndex?: number;
  overlayDuration?: number; // ms before auto-hide
  onStartSurfing?: (channel: M3UChannel) => void;
  onStopSurfing?: () => void;
  onChannelChange?: (channel: M3UChannel, index: number) => void;
  wrapAround?: boolean; // circular navigation
}

export function useChannelSurfing(options: UseChannelSurfingOptions) {
  const {
    channels,
    initialIndex = 0,
    overlayDuration = 4000,
    onStartSurfing,
    onStopSurfing,
    onChannelChange,
    wrapAround = true,
  } = options;

  const [state, setState] = useState<SurfingState>({
    isSurfing: false,
    currentIndex: initialIndex,
    currentChannel: channels[initialIndex] || null,
    channelInfo: channels[initialIndex] ? getChannelExtendedInfo(channels[initialIndex]) : null,
    showOverlay: false,
    overlayTimer: 0,
    totalChannels: channels.length,
  });

  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Clear overlay timer on unmount
  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    };
  }, []);

  // Reset overlay timer
  const resetOverlayTimer = useCallback(() => {
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);

    overlayTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, showOverlay: false }));
    }, overlayDuration);
  }, [overlayDuration]);

  // Show overlay briefly
  const showOverlayBriefly = useCallback(() => {
    setState((prev) => ({ ...prev, showOverlay: true }));
    resetOverlayTimer();
  }, [resetOverlayTimer]);

  // Start surfing mode
  const startSurfing = useCallback(
    (startIndex?: number) => {
      const idx = startIndex ?? stateRef.current.currentIndex;
      const channel = channels[idx] || null;

      if (!channel) return;

      const info = getChannelExtendedInfo(channel);
      setState({
        isSurfing: true,
        currentIndex: idx,
        currentChannel: channel,
        channelInfo: info,
        showOverlay: true,
        overlayTimer: 0,
        totalChannels: channels.length,
      });

      resetOverlayTimer();
      onStartSurfing?.(channel);
    },
    [channels, resetOverlayTimer, onStartSurfing]
  );

  // Stop surfing mode
  const stopSurfing = useCallback(() => {
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    setState((prev) => ({ ...prev, isSurfing: false, showOverlay: false }));
    onStopSurfing?.();
  }, [onStopSurfing]);

  // Navigate channels
  const navigate = useCallback(
    (direction: 'up' | 'down' | 'prev' | 'next') => {
      setState((prev) => {
        if (!prev.isSurfing) return prev;

        let newIndex = prev.currentIndex;

        switch (direction) {
          case 'up':
          case 'next':
            newIndex = wrapAround
              ? (prev.currentIndex + 1) % channels.length
              : Math.min(prev.currentIndex + 1, channels.length - 1);
            break;
          case 'down':
          case 'prev':
            newIndex = wrapAround
              ? (prev.currentIndex - 1 + channels.length) % channels.length
              : Math.max(prev.currentIndex - 1, 0);
            break;
        }

        const channel = channels[newIndex] || prev.currentChannel;
        if (!channel) return prev;

        const info = getChannelExtendedInfo(channel);
        onChannelChange?.(channel, newIndex);

        return {
          ...prev,
          currentIndex: newIndex,
          currentChannel: channel,
          channelInfo: info,
          showOverlay: true,
        };
      });

      resetOverlayTimer();
    },
    [channels, wrapAround, resetOverlayTimer, onChannelChange]
  );

  // Go to specific channel
  const goToChannel = useCallback(
    (index: number) => {
      if (index < 0 || index >= channels.length) return;

      const channel = channels[index];
      const info = getChannelExtendedInfo(channel);

      setState((prev) => ({
        ...prev,
        currentIndex: index,
        currentChannel: channel,
        channelInfo: info,
        showOverlay: true,
      }));

      resetOverlayTimer();
      onChannelChange?.(channel, index);
    },
    [channels, resetOverlayTimer, onChannelChange]
  );

  // Toggle overlay visibility
  const toggleOverlay = useCallback(() => {
    setState((prev) => ({ ...prev, showOverlay: !prev.showOverlay }));
    if (stateRef.current.showOverlay) {
      // Will be hidden, clear timer
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    } else {
      // Will be shown, start timer
      resetOverlayTimer();
    }
  }, [resetOverlayTimer]);

  // Set channels (update without resetting surfing state)
  const setChannels = useCallback(
    (newChannels: M3UChannel[]) => {
      setState((prev) => ({
        ...prev,
        totalChannels: newChannels.length,
        currentChannel: newChannels[prev.currentIndex] || prev.currentChannel,
        channelInfo: newChannels[prev.currentIndex]
          ? getChannelExtendedInfo(newChannels[prev.currentIndex])
          : prev.channelInfo,
      }));
    },
    []
  );

  // Keyboard navigation
  useEffect(() => {
    if (!state.isSurfing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          navigate('down');
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          stopSurfing();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          toggleOverlay();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isSurfing, navigate, stopSurfing, toggleOverlay]);

  return {
    ...state,
    startSurfing,
    stopSurfing,
    navigate,
    goToChannel,
    toggleOverlay,
    showOverlayBriefly,
    setChannels,
  };
}
