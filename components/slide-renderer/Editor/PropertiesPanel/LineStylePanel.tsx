'use client';

import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import type { PPTLineElement, LineStyleType } from '@/lib/types/slides';
import { ColorInput, Row, Section } from './shared';

const STYLES: { value: LineStyleType; label: string }[] = [
  { value: 'solid', label: '—' },
  { value: 'dashed', label: '- -' },
  { value: 'dotted', label: '···' },
];

export function LineStylePanel({ element }: { element: PPTLineElement }) {
  const { updateElement } = useCanvasOperations();

  const update = (props: Partial<PPTLineElement>) => {
    updateElement({ id: element.id, props: props as never });
  };

  return (
    <Section title="Line">
      <div className="flex flex-col gap-1.5">
        <Row>
          <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">Color</span>
          <ColorInput
            value={element.color ?? '#333333'}
            onChange={(v) => update({ color: v })}
          />
        </Row>
        <Row>
          <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">Style</span>
          <div className="flex gap-0.5">
            {STYLES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => update({ style: value })}
                title={value}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                  element.style === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      </div>
    </Section>
  );
}
