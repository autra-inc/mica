'use client';

import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import type { PPTElement } from '@/lib/types/slides';
import { NumInput, Row, Section } from './shared';

export function PositionPanel({ element }: { element: PPTElement }) {
  const { updateElement } = useCanvasOperations();

  const isLine = element.type === 'line';

  const update = (props: Partial<PPTElement>) => {
    updateElement({ id: element.id, props });
  };

  return (
    <Section title="Position & Size">
      <div className="flex flex-col gap-1">
        <Row>
          <NumInput
            label="X"
            value={element.left}
            onChange={(v) => update({ left: v })}
            step={1}
            unit="px"
          />
          <NumInput
            label="Y"
            value={element.top}
            onChange={(v) => update({ top: v })}
            step={1}
            unit="px"
          />
        </Row>
        {!isLine && (
          <>
            <Row>
              <NumInput
                label="W"
                value={element.width}
                onChange={(v) => update({ width: Math.max(v, 1) })}
                min={1}
                step={1}
                unit="px"
              />
              <NumInput
                label="H"
                value={element.height}
                onChange={(v) => update({ height: Math.max(v, 1) })}
                min={1}
                step={1}
                unit="px"
              />
            </Row>
            <Row>
              <NumInput
                label="R"
                value={element.rotate}
                onChange={(v) => update({ rotate: v })}
                min={-360}
                max={360}
                step={1}
                unit="°"
              />
              <div className="flex-1" />
            </Row>
          </>
        )}
      </div>
    </Section>
  );
}
