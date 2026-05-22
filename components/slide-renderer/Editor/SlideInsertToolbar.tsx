'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import {
  Type,
  Square,
  Circle,
  Minus,
  ArrowRight,
  ImagePlus,
  Table,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import { SHAPE_LIST } from '@/configs/shapes';
import { LINE_LIST } from '@/configs/lines';
import type { PPTTableElement } from '@/lib/types/slides';

// ── Shared button style ────────────────────────────────────────────────────
const btn = cn(
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
  'text-gray-700 dark:text-gray-200',
  'hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95',
  'transition-all duration-100 cursor-pointer select-none',
);

const activebtn = 'bg-primary/10 text-primary dark:text-primary';

// ── Table grid picker ──────────────────────────────────────────────────────
function TablePicker({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  const MAX = 8;
  return (
    <div className="p-2">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${MAX}, 1fr)` }}
      >
        {Array.from({ length: MAX * MAX }).map((_, i) => {
          const row = Math.floor(i / MAX) + 1;
          const col = (i % MAX) + 1;
          const active = row <= hover[0] && col <= hover[1];
          return (
            <div
              key={i}
              className={cn(
                'w-5 h-5 border rounded-sm cursor-pointer transition-colors duration-75',
                active
                  ? 'bg-primary/20 border-primary/40'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600',
              )}
              onMouseEnter={() => setHover([row, col])}
              onClick={() => onPick(row, col)}
            />
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500 mt-1.5">
        {hover[0] > 0 ? `${hover[0]} × ${hover[1]}` : 'Hover to select'}
      </p>
    </div>
  );
}

// ── Main toolbar ───────────────────────────────────────────────────────────
export function SlideInsertToolbar() {
  const setCreatingElement = useCanvasStore.use.setCreatingElement();
  const creatingElement = useCanvasStore.use.creatingElement();
  const { addElement } = useCanvasOperations();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tablePickerRef = useRef<HTMLDivElement>(null);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);

  useEffect(() => {
    if (!tablePickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (tablePickerRef.current && !tablePickerRef.current.contains(e.target as Node)) {
        setTablePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tablePickerOpen]);

  // Rect shape: first child of the '矩形' group
  const rectShape = SHAPE_LIST.find((g) => g.type === '矩形')?.children[0];
  // Ellipse shape from '常用形状'
  const ellipseShape = SHAPE_LIST.find((g) => g.type === '常用形状')?.children[0];
  // Simple arrow line
  const arrowLine = LINE_LIST[0]?.children.find((l) => l.points[1] === 'arrow');
  // Plain line
  const plainLine = LINE_LIST[0]?.children[0];

  const startCreatingText = useCallback(() => {
    setCreatingElement({ type: 'text' });
  }, [setCreatingElement]);

  const startCreatingRect = useCallback(() => {
    if (!rectShape) return;
    setCreatingElement({ type: 'shape', data: rectShape });
  }, [setCreatingElement, rectShape]);

  const startCreatingEllipse = useCallback(() => {
    if (!ellipseShape) return;
    setCreatingElement({ type: 'shape', data: ellipseShape });
  }, [setCreatingElement, ellipseShape]);

  const startCreatingLine = useCallback(() => {
    if (!plainLine) return;
    setCreatingElement({ type: 'line', data: plainLine });
  }, [setCreatingElement, plainLine]);

  const startCreatingArrow = useCallback(() => {
    if (!arrowLine) return;
    setCreatingElement({ type: 'line', data: arrowLine });
  }, [setCreatingElement, arrowLine]);

  const handleImageFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Scale to fit within 500px wide max, preserve ratio
          const maxW = 500;
          const scale = img.width > maxW ? maxW / img.width : 1;
          const w = img.width * scale;
          const h = img.height * scale;
          addElement({
            id: nanoid(10),
            type: 'image',
            src,
            fixedRatio: true,
            left: (1000 - w) / 2,
            top: (562 - h) / 2,
            width: w,
            height: h,
            rotate: 0,
          });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [addElement],
  );

  const handleInsertTable = useCallback(
    (rows: number, cols: number) => {
      setTablePickerOpen(false);
      const colWidth = 1 / cols;
      const tableEl: PPTTableElement = {
        id: nanoid(10),
        type: 'table',
        left: 100,
        top: 100,
        width: 600,
        height: rows * 44,
        rotate: 0,
        outline: { width: 1, color: '#cccccc', style: 'solid' },
        colWidths: Array(cols).fill(colWidth),
        cellMinHeight: 44,
        data: Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, () => ({
            id: nanoid(10),
            colspan: 1,
            rowspan: 1,
            text: '',
            style: r === 0 ? { bold: true, backcolor: '#f0efff' } : undefined,
          })),
        ),
      };
      addElement(tableEl);
    },
    [addElement],
  );

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Text */}
      <button
        className={cn(btn, creatingElement?.type === 'text' && activebtn)}
        onClick={startCreatingText}
        title="Insert text box — draw on slide to place"
      >
        <Type className="w-3.5 h-3.5" />
        <span>Text</span>
      </button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      {/* Rectangle */}
      <button
        className={cn(
          btn,
          creatingElement?.type === 'shape' &&
            'data' in creatingElement &&
            creatingElement.data === rectShape &&
            activebtn,
        )}
        onClick={startCreatingRect}
        title="Insert rectangle — draw on slide to place"
      >
        <Square className="w-3.5 h-3.5" />
        <span>Rect</span>
      </button>

      {/* Ellipse */}
      <button
        className={cn(
          btn,
          creatingElement?.type === 'shape' &&
            'data' in creatingElement &&
            creatingElement.data === ellipseShape &&
            activebtn,
        )}
        onClick={startCreatingEllipse}
        title="Insert ellipse — draw on slide to place"
      >
        <Circle className="w-3.5 h-3.5" />
        <span>Circle</span>
      </button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      {/* Line */}
      <button
        className={cn(
          btn,
          creatingElement?.type === 'line' &&
            'data' in creatingElement &&
            creatingElement.data === plainLine &&
            activebtn,
        )}
        onClick={startCreatingLine}
        title="Insert line — draw on slide to place"
      >
        <Minus className="w-3.5 h-3.5" />
        <span>Line</span>
      </button>

      {/* Arrow */}
      <button
        className={cn(
          btn,
          creatingElement?.type === 'line' &&
            'data' in creatingElement &&
            creatingElement.data === arrowLine &&
            activebtn,
        )}
        onClick={startCreatingArrow}
        title="Insert arrow — draw on slide to place"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span>Arrow</span>
      </button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      {/* Image */}
      <button
        className={btn}
        onClick={() => fileInputRef.current?.click()}
        title="Insert image from file"
      >
        <ImagePlus className="w-3.5 h-3.5" />
        <span>Image</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />

      {/* Table */}
      <div className="relative" ref={tablePickerRef}>
        <button
          className={cn(btn, tablePickerOpen && activebtn)}
          onClick={() => setTablePickerOpen((o) => !o)}
          title="Insert table"
        >
          <Table className="w-3.5 h-3.5" />
          <span>Table</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
        {tablePickerOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
            <TablePicker onPick={handleInsertTable} />
          </div>
        )}
      </div>

      {/* Hint when a draw tool is active */}
      {creatingElement && (
        <span className="ml-2 text-xs text-primary italic">
          Draw on the slide to place →
        </span>
      )}
    </div>
  );
}
