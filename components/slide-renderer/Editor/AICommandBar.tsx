'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import { useHistorySnapshot } from '@/lib/hooks/use-history-snapshot';
import { useSceneSelector, useSceneData } from '@/lib/contexts/scene-context';
import { useSettingsStore } from '@/lib/store/settings';
import type { SlideContent } from '@/lib/types/stage';
import type { Slide, PPTElement } from '@/lib/types/slides';
import type { ImageGenerationResult } from '@/lib/media/types';

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

type Tab = 'edit' | 'image';

const HINT_CHIPS = [
  'Rearrange in a clean layout',
  'Polish all text',
  'Compress to bullets',
  'Expand text',
  'Make title larger',
  'Change background color',
];

export function AICommandBar() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('edit');
  const [prompt, setPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { addElement, updateElement, deleteElement } = useCanvasOperations();
  const { addHistorySnapshot } = useHistorySnapshot();
  const currentSlide = useSceneSelector<SlideContent, Slide>((c) => c.canvas);
  const { sceneId } = useSceneData<SlideContent>();

  const imageProviderId = useSettingsStore((s) => s.imageProviderId);
  const imageProvidersConfig = useSettingsStore((s) => s.imageProvidersConfig);

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

  // Focus textarea when popover opens or tab changes
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (tab === 'edit') {
          textareaRef.current?.focus();
        } else {
          imageTextareaRef.current?.focus();
        }
      }, 50);
    }
  }, [open, tab]);

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

  const submitImage = useCallback(async () => {
    if (!imagePrompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const providerConfig = imageProvidersConfig[imageProviderId];
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-image-provider': imageProviderId,
          'x-api-key': providerConfig?.apiKey || '',
          'x-base-url': providerConfig?.baseUrl || '',
        },
        body: JSON.stringify({ prompt: imagePrompt.trim(), aspectRatio: '16:9' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Image generation failed');
        return;
      }

      const result: ImageGenerationResult = data.result;
      let src: string;
      if (result.url) {
        src = result.url;
      } else if (result.base64) {
        src = `data:image/png;base64,${result.base64}`;
      } else {
        setError('No image returned');
        return;
      }

      // Try to upload to S3 via media API
      let finalSrc = src;
      try {
        const uploadRes = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: sceneId, dataUrl: src }),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            finalSrc = uploadData.url;
          }
        }
      } catch {
        // Fallback to original src if upload fails
      }

      addElement({
        id: nanoid(10),
        type: 'image',
        src: finalSrc,
        fixedRatio: true,
        left: 250,
        top: 131,
        width: 500,
        height: 300,
        rotate: 0,
      } as PPTElement);
      addHistorySnapshot();

      setImagePrompt('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [imagePrompt, loading, imageProviderId, imageProvidersConfig, sceneId, addElement, addHistorySnapshot]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        className={cn(btn, open && 'bg-primary/10 text-primary')}
        onClick={() => {
          setOpen((o) => !o);
          setError(null);
        }}
        title="AI edit slide"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3">
          {/* Header with tabs */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              <button
                onClick={() => { setTab('edit'); setError(null); }}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                  tab === 'edit'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                <Sparkles className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => { setTab('image'); setError(null); }}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                  tab === 'image'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                <ImageIcon className="w-3 h-3" />
                Image
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {tab === 'edit' && (
            <>
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
                placeholder={
                  'Add a title, update text, rearrange elements...\nPress Enter to run, Shift+Enter for newline'
                }
                rows={3}
                disabled={loading}
                className={cn(
                  'w-full text-xs resize-none rounded border border-gray-200 dark:border-gray-600 p-2',
                  'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200',
                  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40',
                  loading && 'opacity-50 cursor-not-allowed',
                )}
              />

              {/* Hint chips */}
              <div className="flex flex-wrap gap-1 mt-2">
                {HINT_CHIPS.map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setPrompt(hint)}
                    className="text-xs px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-500 dark:text-gray-400"
                  >
                    {hint}
                  </button>
                ))}
              </div>

              {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}

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
            </>
          )}

          {tab === 'image' && (
            <>
              <textarea
                ref={imageTextareaRef}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitImage();
                  }
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Describe the image you want to add..."
                rows={3}
                disabled={loading}
                className={cn(
                  'w-full text-xs resize-none rounded border border-gray-200 dark:border-gray-600 p-2',
                  'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200',
                  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40',
                  loading && 'opacity-50 cursor-not-allowed',
                )}
              />

              {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}

              <div className="flex justify-end mt-2">
                <button
                  onClick={submitImage}
                  disabled={!imagePrompt.trim() || loading}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium',
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
                      <ImageIcon className="w-3 h-3" /> Generate
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
