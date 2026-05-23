'use client';

import { useMemo } from 'react';
import { MousePointer2 } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { useSceneSelector } from '@/lib/contexts/scene-context';
import type { SlideContent } from '@/lib/types/stage';
import type { Slide, PPTElement } from '@/lib/types/slides';
import { PositionPanel } from './PositionPanel';
import { TextStylePanel } from './TextStylePanel';
import { ShapeStylePanel } from './ShapeStylePanel';
import { ImageStylePanel } from './ImageStylePanel';
import { LineStylePanel } from './LineStylePanel';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 dark:text-gray-600 px-4 text-center">
      <MousePointer2 className="w-6 h-6" />
      <p className="text-xs">Select an element to edit its properties</p>
    </div>
  );
}

export function PropertiesPanel() {
  const activeElementIdList = useCanvasStore.use.activeElementIdList();
  const currentSlide = useSceneSelector<SlideContent, Slide>((c) => c.canvas);

  const activeElement = useMemo<PPTElement | null>(() => {
    if (activeElementIdList.length !== 1) return null;
    return currentSlide.elements.find((el) => el.id === activeElementIdList[0]) ?? null;
  }, [activeElementIdList, currentSlide.elements]);

  return (
    <div className="w-56 flex-shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Properties</p>
      </div>

      {!activeElement ? (
        <EmptyState />
      ) : (
        <>
          <PositionPanel element={activeElement} />
          {activeElement.type === 'text' && <TextStylePanel element={activeElement} />}
          {activeElement.type === 'shape' && <ShapeStylePanel element={activeElement} />}
          {activeElement.type === 'image' && <ImageStylePanel element={activeElement} />}
          {activeElement.type === 'line' && <LineStylePanel element={activeElement} />}
        </>
      )}
    </div>
  );
}
