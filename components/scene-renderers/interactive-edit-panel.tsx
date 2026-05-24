'use client';

import { useState, useCallback } from 'react';
import { Wand2, RotateCcw, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStageStore } from '@/lib/store';
import type { InteractiveContent } from '@/lib/types/stage';
import type { WidgetConfig } from '@/lib/types/widgets';
import type { TeacherAction } from '@/lib/types/widgets';

interface InteractiveEditPanelProps {
  readonly content: InteractiveContent;
  readonly sceneId: string;
  readonly onClose: () => void;
}

type EditMode = 'patch' | 'regenerate';

export function InteractiveEditPanel({ content, sceneId, onClose }: InteractiveEditPanelProps) {
  const [mode, setMode] = useState<EditMode>('patch');
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previousHtml, setPreviousHtml] = useState<string | null>(null);
  const updateScene = useStageStore((s) => s.updateScene);

  const handleApply = useCallback(async () => {
    if (!instruction.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/generate/interactive-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          instruction: instruction.trim(),
          widgetType: content.widgetType,
          currentHtml: content.html || '',
          widgetConfig: content.widgetConfig,
        }),
      });
      if (!res.ok) throw new Error(`Edit failed: ${res.status}`);
      const result = (await res.json()) as {
        html: string;
        widgetConfig?: WidgetConfig;
        teacherActions?: TeacherAction[];
      };
      setPreviousHtml(content.html ?? null);
      updateScene(sceneId, {
        content: {
          ...content,
          html: result.html,
          widgetConfig: result.widgetConfig ?? content.widgetConfig,
          teacherActions: result.teacherActions ?? content.teacherActions,
        },
      });
      setInstruction('');
    } catch (err) {
      console.error('[InteractiveEditPanel] edit failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [instruction, isLoading, mode, content, sceneId, updateScene]);

  const handleUndo = useCallback(() => {
    if (!previousHtml) return;
    updateScene(sceneId, { content: { ...content, html: previousHtml } });
    setPreviousHtml(null);
  }, [previousHtml, content, sceneId, updateScene]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleApply();
      }
    },
    [handleApply],
  );

  return (
    <div className="shrink-0 border-t border-gray-200/40 dark:border-gray-700/40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl px-3 py-2">
      <div className="flex items-center gap-2">
        {/* Mode label + toggle */}
        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mr-1.5 select-none">
            AI Edit
          </span>
          <button
            onClick={() => setMode('patch')}
            className={cn(
              'h-6 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer',
              mode === 'patch'
                ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50',
            )}
          >
            Patch
          </button>
          <button
            onClick={() => setMode('regenerate')}
            className={cn(
              'h-6 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer',
              mode === 'regenerate'
                ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50',
            )}
          >
            Regenerate
          </button>
        </div>

        {/* Instruction input */}
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'patch' ? 'Describe a targeted change…' : 'Describe what to rebuild…'
          }
          disabled={isLoading}
          className="flex-1 h-7 px-2.5 text-xs rounded-md border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
        />

        {/* Apply */}
        <button
          onClick={handleApply}
          disabled={!instruction.trim() || isLoading}
          className={cn(
            'h-7 px-3 rounded-md text-[11px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer',
            'bg-violet-500 text-white hover:bg-violet-600 active:scale-95 transition-all',
            'disabled:opacity-40 disabled:pointer-events-none',
          )}
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          {isLoading ? 'Applying…' : 'Apply'}
        </button>

        {/* Undo */}
        {previousHtml && (
          <button
            onClick={handleUndo}
            className="h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 shrink-0 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Undo
          </button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors shrink-0 cursor-pointer"
          aria-label="Close AI edit panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
