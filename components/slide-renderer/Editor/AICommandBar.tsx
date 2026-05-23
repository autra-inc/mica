'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import { useHistorySnapshot } from '@/lib/hooks/use-history-snapshot';
import { useSceneSelector } from '@/lib/contexts/scene-context';
import type { SlideContent } from '@/lib/types/stage';
import type { Slide, PPTElement } from '@/lib/types/slides';

const btn = cn(
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
  'text-gray-700 dark:text-gray-200',
  'hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95',
  'transition-all duration-100 cursor-pointer select-none',
);

type SlideOp =
  | { op: 'add'; element: PPTElement }
  | { op: 'update'; id: string; props: Partial<PPTElement> }
  | { op: 'delete'; id: string };

export function AICommandBar() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { addElement, updateElement, deleteElement } = useCanvasOperations();
  const { addHistorySnapshot } = useHistorySnapshot();
  const currentSlide = useSceneSelector<SlideContent, Slide>((c) => c.canvas);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus textarea when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  const submit = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const config = getCurrentModelConfig();
      const res = await fetch('/api/generate/slide-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-model': config.modelString || '',
          'x-api-key': config.apiKey || '',
          'x-base-url': config.baseUrl || '',
          'x-provider-type': config.providerType || '',
        },
        body: JSON.stringify({ prompt: prompt.trim(), slide: currentSlide }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Generation failed');
        return;
      }

      const ops: SlideOp[] = data.ops ?? [];
      for (const op of ops) {
        if (op.op === 'add') {
          const el = op.element.id ? op.element : { ...op.element, id: nanoid(10) };
          addElement(el as PPTElement);
        } else if (op.op === 'update') {
          updateElement({ id: op.id, props: op.props });
        } else if (op.op === 'delete') {
          deleteElement(op.id);
        }
      }
      if (ops.length > 0) addHistorySnapshot();

      setPrompt('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, currentSlide, addElement, updateElement, deleteElement, addHistorySnapshot]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        className={cn(btn, open && 'bg-primary/10 text-primary')}
        onClick={() => { setOpen((o) => !o); setError(null); }}
        title="AI edit slide"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Edit with AI
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder={'Add a title, update text, rearrange elements...\nPress Enter to run, Shift+Enter for newline'}
            rows={3}
            disabled={loading}
            className={cn(
              'w-full text-xs resize-none rounded border border-gray-200 dark:border-gray-600 p-2',
              'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200',
              'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40',
              loading && 'opacity-50 cursor-not-allowed',
            )}
          />

          {error && (
            <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={submit}
              disabled={!prompt.trim() || loading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium',
                'bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {loading ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="w-3 h-3" /> Generate</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
