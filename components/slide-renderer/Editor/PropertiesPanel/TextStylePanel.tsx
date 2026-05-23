'use client';

import { useState } from 'react';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import type { PPTTextElement } from '@/lib/types/slides';
import { ColorInput, NumInput, OpacityRow, Row, Section } from './shared';

export function TextStylePanel({ element }: { element: PPTTextElement }) {
  const { updateElement } = useCanvasOperations();
  const [hasBg, setHasBg] = useState(!!element.fill);

  const update = (props: Partial<PPTTextElement>) => {
    updateElement({ id: element.id, props: props as never });
  };

  const toggleBg = () => {
    if (hasBg) {
      setHasBg(false);
      update({ fill: undefined });
    } else {
      setHasBg(true);
      update({ fill: '#ffffff' });
    }
  };

  return (
    <>
      <Section title="Text">
        <div className="flex flex-col gap-1.5">
          <Row>
            <span className="text-[10px] text-gray-500 w-14 flex-shrink-0">Color</span>
            <ColorInput
              value={element.defaultColor ?? '#333333'}
              onChange={(v) => update({ defaultColor: v })}
            />
          </Row>
          <Row>
            <span className="text-[10px] text-gray-500 w-14 flex-shrink-0">Line ht.</span>
            <NumInput
              label=""
              value={element.lineHeight ?? 1.5}
              onChange={(v) => update({ lineHeight: v })}
              min={0.5}
              max={4}
              step={0.1}
            />
          </Row>
        </div>
      </Section>

      <Section title="Background">
        <div className="flex flex-col gap-1.5">
          <Row>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasBg}
                onChange={toggleBg}
                className="w-3 h-3 accent-primary"
              />
              <span className="text-[10px] text-gray-600 dark:text-gray-400">Fill color</span>
            </label>
          </Row>
          {hasBg && (
            <ColorInput
              value={element.fill ?? '#ffffff'}
              onChange={(v) => update({ fill: v })}
            />
          )}
          <OpacityRow
            value={element.opacity}
            onChange={(v) => update({ opacity: v })}
          />
        </div>
      </Section>
    </>
  );
}
