'use client';

import { useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store';
import { useSceneSelector } from '@/lib/contexts/scene-context';
import emitter, { EmitterEvents } from '@/lib/utils/emitter';
import type { SlideContent } from '@/lib/types/stage';
import type { Slide } from '@/lib/types/slides';

// ── helpers ────────────────────────────────────────────────────────────────

function cmd(command: string, value?: string) {
  emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { action: { command, value } });
}

const divider = <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />;

function Btn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center w-6 h-6 rounded text-xs cursor-pointer transition-colors',
        'text-gray-600 dark:text-gray-300',
        active
          ? 'bg-primary/15 text-primary'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700',
        disabled && 'opacity-30 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

function ColorBtn({
  color,
  title,
  onChange,
}: {
  color: string;
  title: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center cursor-pointer" title={title}>
      <button
        onMouseDown={(e) => { e.preventDefault(); ref.current?.click(); }}
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-none">A</span>
      </button>
      <div
        className="w-4 h-0.5 rounded-full -mt-0.5"
        style={{ backgroundColor: color || '#000000' }}
      />
      <input
        ref={ref}
        type="color"
        value={color || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function TextFormatBar() {
  const editingElementId = useCanvasStore.use.editingElementId();
  const activeElementIdList = useCanvasStore.use.activeElementIdList();
  const richTextAttrs = useCanvasStore.use.richTextAttrs();
  const currentSlide = useSceneSelector<SlideContent, Slide>((c) => c.canvas);

  // Determine if a text element is selected
  const selectedTextElement =
    activeElementIdList.length === 1
      ? currentSlide.elements.find(
          (el) => el.id === activeElementIdList[0] && el.type === 'text',
        )
      : undefined;

  if (!selectedTextElement) return null;

  const isEditing = !!editingElementId;
  const attrs = richTextAttrs;

  // Parse font size number from "16px" string
  const fontSize = parseInt(attrs.fontsize) || 16;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 flex-wrap">
      {/* Bold / Italic / Underline / Strikethrough */}
      <Btn active={attrs.bold} disabled={!isEditing} title="Bold" onClick={() => cmd('bold')}>
        <Bold className="w-3 h-3" />
      </Btn>
      <Btn active={attrs.em} disabled={!isEditing} title="Italic" onClick={() => cmd('em')}>
        <Italic className="w-3 h-3" />
      </Btn>
      <Btn active={attrs.underline} disabled={!isEditing} title="Underline" onClick={() => cmd('underline')}>
        <Underline className="w-3 h-3" />
      </Btn>
      <Btn active={attrs.strikethrough} disabled={!isEditing} title="Strikethrough" onClick={() => cmd('strikethrough')}>
        <Strikethrough className="w-3 h-3" />
      </Btn>

      {divider}

      {/* Font size */}
      <Btn disabled={!isEditing} title="Decrease font size" onClick={() => cmd('fontsize-reduce', '2')}>
        <span className="text-[10px] font-medium leading-none">A−</span>
      </Btn>
      <div className="flex items-center">
        <input
          type="number"
          value={fontSize}
          min={8}
          max={200}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= 8 && v <= 200) cmd('fontsize', `${v}px`);
          }}
          className={cn(
            'w-9 h-6 text-center text-xs border border-gray-200 dark:border-gray-600 rounded',
            'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
            'focus:outline-none focus:ring-1 focus:ring-primary/40',
            !isEditing && 'opacity-40',
          )}
        />
      </div>
      <Btn disabled={!isEditing} title="Increase font size" onClick={() => cmd('fontsize-add', '2')}>
        <span className="text-[10px] font-medium leading-none">A+</span>
      </Btn>

      {divider}

      {/* Text color */}
      <ColorBtn
        color={attrs.color}
        title="Text color"
        onChange={(v) => cmd('color', v)}
      />
      {/* Background color */}
      <ColorBtn
        color={attrs.backcolor}
        title="Highlight color"
        onChange={(v) => cmd('backcolor', v)}
      />

      {divider}

      {/* Alignment */}
      <Btn active={attrs.align === 'left'} disabled={!isEditing} title="Align left" onClick={() => cmd('align', 'left')}>
        <AlignLeft className="w-3 h-3" />
      </Btn>
      <Btn active={attrs.align === 'center'} disabled={!isEditing} title="Align center" onClick={() => cmd('align', 'center')}>
        <AlignCenter className="w-3 h-3" />
      </Btn>
      <Btn active={attrs.align === 'right'} disabled={!isEditing} title="Align right" onClick={() => cmd('align', 'right')}>
        <AlignRight className="w-3 h-3" />
      </Btn>

      {divider}

      {/* Lists */}
      <Btn active={attrs.bulletList} disabled={!isEditing} title="Bullet list" onClick={() => cmd('bulletList')}>
        <List className="w-3 h-3" />
      </Btn>
      <Btn active={attrs.orderedList} disabled={!isEditing} title="Numbered list" onClick={() => cmd('orderedList')}>
        <ListOrdered className="w-3 h-3" />
      </Btn>

      {/* Hint when not editing */}
      {!isEditing && (
        <span className="ml-2 text-[10px] text-gray-400 italic">
          Click inside text to edit formatting
        </span>
      )}
    </div>
  );
}
