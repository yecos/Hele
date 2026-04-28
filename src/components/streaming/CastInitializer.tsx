'use client';

import { useEffect } from 'react';
import { useCastStore } from '@/lib/cast-store';

/**
 * Initializes the Cast SDK globally when the app mounts.
 * Place this component once in the app tree (page.tsx).
 * The actual SDK <script> tag is already in layout.tsx.
 */
export default function CastInitializer() {
  const initialize = useCastStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return null; // No UI — purely functional
}
