'use client';

import { FlipHorizontal, FlipVertical } from 'lucide-react';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import type { PPTImageElement } from '@/lib/types/slides';
import { cn } from '@/lib/utils';
import { OpacityRow, Row, Section } from './shared';

export function ImageStylePanel({ element }: { element: PPTImageElement }) {
  const { updateElement } = useCanvasOperations();

  const update = (props: Partial<PPTImageElement>) => {
    updateElement({ id: element.id, props: props as never });
  };

  return (
    <Section title="Image">
      <div className="flex flex-col gap-1.5">
        <OpacityRow
          value={element.filters?.opacity !== undefined ? parseFloat(element.filters.opacity) / 100 : 1}
          onChange={(v) => {
            update({
              filters: { ...element.filters, opacity: `${Math.round(v * 100)}` },
            });
          }}
        />
        <Row>
          <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">Flip</span>
          <button
            onClick={() => update({ flipH: !element.flipH })}
            title="Flip horizontal"
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-[10px] border cursor-pointer transition-colors',
              element.flipH
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-400',
            )}
          >
            <FlipHorizontal className="w-3 h-3" />
            H
          </button>
          <button
            onClick={() => update({ flipV: !element.flipV })}
            title="Flip vertical"
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-[10px] border cursor-pointer transition-colors',
              element.flipV
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-400',
            )}
          >
            <FlipVertical className="w-3 h-3" />
            V
          </button>
        </Row>
      </div>
    </Section>
  );
}
