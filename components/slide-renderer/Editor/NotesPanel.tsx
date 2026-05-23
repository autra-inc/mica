'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import { useHistorySnapshot } from '@/lib/hooks/use-history-snapshot';
import { useSceneSelector } from '@/lib/contexts/scene-context';
import type { SlideContent } from '@/lib/types/stage';
import type { Slide } from '@/lib/types/slides';

export function NotesPanel() {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { updateSlide } = useCanvasOperations();
  const { addHistorySnapshot } = useHistorySnapshot();
  const currentSlide = useSceneSelector<SlideContent, Slide>((c) => c.canvas);

  // Sync textarea with current slide notes when slide changes
  useEffect(() => {
    setValue(currentSlide.notes ?? '');
  }, [currentSlide.id, currentSlide.notes]);

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateSlide({ notes: newValue });
      }, 500);
    },
    [updateSlide],
  );

  const handleGenerate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const config = getCurrentModelConfig();
      const res = await fetch('/api/generate/slide-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-model': config.modelString || '',
          'x-api-key': config.apiKey || '',
          'x-base-url': config.baseUrl || '',
          'x-provider-type': config.providerType || '',
        },
        body: JSON.stringify({ slide: currentSlide }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Generation failed');
        return;
      }

      const notes: string = data.notes ?? '';
      setValue(notes);
      updateSlide({ notes });
      addHistorySnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [loading, currentSlide, updateSlide, addHistorySnapshot]);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-1.5',
          'text-xs text-gray-500 dark:text-gray-400',
          'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
        )}
      >
        <span className="font-medium">Notes</span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            rows={3}
            placeholder="Add presenter notes..."
            className={cn(
              'w-full text-xs resize-none rounded border border-gray-200 dark:border-gray-600 p-2',
              'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
              'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40',
            )}
          />

          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium',
                'bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" /> Generate
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
