'use client';

import { useState, useRef, useEffect } from 'react';
import { Shapes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store';
import { SHAPE_LIST } from '@/configs/shapes';
import type { ShapePoolItem } from '@/configs/shapes';

const CATEGORY_LABELS: Record<string, string> = {
  矩形: 'Rect',
  常用形状: 'Shapes',
  箭头: 'Arrows',
  其他形状: 'More',
  线性: 'Icons',
};

function ShapeThumbnail({
  item,
  active,
  onClick,
}: {
  item: ShapePoolItem;
  active: boolean;
  onClick: () => void;
}) {
  const [vw, vh] = item.viewBox;
  return (
    <button
      onClick={onClick}
      title="Click then draw on slide to place"
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded cursor-pointer',
        'hover:bg-primary/10 transition-colors duration-100',
        active && 'bg-primary/20 ring-1 ring-primary/40',
      )}
    >
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-5 h-5" style={{ overflow: 'visible' }}>
        <path
          d={item.path}
          fill={item.special ? 'none' : 'currentColor'}
          stroke={item.special ? 'currentColor' : 'none'}
          strokeWidth={item.special ? vw * 0.06 : 0}
          className="text-gray-700 dark:text-gray-200"
        />
      </svg>
    </button>
  );
}

export function ShapePickerPopover() {
  const setCreatingElement = useCanvasStore.use.setCreatingElement();
  const creatingElement = useCanvasStore.use.creatingElement();

  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(SHAPE_LIST[0]?.type ?? '');
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const activeShape =
    creatingElement?.type === 'shape' && 'data' in creatingElement ? creatingElement.data : null;

  const currentCategory = SHAPE_LIST.find((g) => g.type === activeCategory);

  const handleSelect = (item: ShapePoolItem) => {
    setCreatingElement({ type: 'shape', data: item });
    setOpen(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
          'text-gray-700 dark:text-gray-200',
          'hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95',
          'transition-all duration-100 cursor-pointer select-none',
          (open || activeShape) && 'bg-primary/10 text-primary dark:text-primary',
        )}
        title="Insert shape"
      >
        <Shapes className="w-3.5 h-3.5" />
        <span>Shapes</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
          {/* Category tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800 px-1 pt-1 gap-0.5">
            {SHAPE_LIST.map((group) => (
              <button
                key={group.type}
                onClick={() => setActiveCategory(group.type)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium rounded-t-md transition-colors duration-100 cursor-pointer',
                  activeCategory === group.type
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                {CATEGORY_LABELS[group.type] ?? group.type}
              </button>
            ))}
          </div>

          {/* Shape grid */}
          <div className="p-2 max-h-56 overflow-y-auto">
            <div className="grid grid-cols-8 gap-0.5">
              {currentCategory?.children.map((item, i) => (
                <ShapeThumbnail
                  key={i}
                  item={item}
                  active={activeShape === item}
                  onClick={() => handleSelect(item)}
                />
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 py-1.5 border-t border-gray-100 dark:border-gray-800">
            Click a shape, then draw on the slide
          </p>
        </div>
      )}
    </div>
  );
}
