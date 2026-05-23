'use client';

import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import type { PPTShapeElement, PPTElementOutline } from '@/lib/types/slides';
import { ColorInput, NumInput, OpacityRow, Row, Section } from './shared';

export function ShapeStylePanel({ element }: { element: PPTShapeElement }) {
  const { updateElement } = useCanvasOperations();

  const update = (props: Partial<PPTShapeElement>) => {
    updateElement({ id: element.id, props: props as never });
  };

  const updateOutline = (patch: Partial<PPTElementOutline>) => {
    update({ outline: { ...element.outline, ...patch } });
  };

  const hasOutline = !!element.outline;

  const toggleOutline = () => {
    update({ outline: hasOutline ? undefined : { width: 2, color: '#333333', style: 'solid' } });
  };

  return (
    <>
      <Section title="Fill">
        <div className="flex flex-col gap-1.5">
          <ColorInput
            value={element.fill ?? '#5b5ea6'}
            onChange={(v) => update({ fill: v })}
          />
          <OpacityRow value={element.opacity} onChange={(v) => update({ opacity: v })} />
        </div>
      </Section>

      <Section title="Outline">
        <div className="flex flex-col gap-1.5">
          <Row>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasOutline}
                onChange={toggleOutline}
                className="w-3 h-3 accent-primary"
              />
              <span className="text-[10px] text-gray-600 dark:text-gray-400">Border</span>
            </label>
          </Row>
          {hasOutline && (
            <>
              <Row>
                <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">Color</span>
                <ColorInput
                  value={element.outline?.color ?? '#333333'}
                  onChange={(v) => updateOutline({ color: v })}
                />
              </Row>
              <Row>
                <NumInput
                  label="W"
                  value={element.outline?.width ?? 2}
                  onChange={(v) => updateOutline({ width: v })}
                  min={1}
                  max={20}
                  step={1}
                  unit="px"
                />
                <div className="flex gap-0.5 flex-shrink-0">
                  {(['solid', 'dashed', 'dotted'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateOutline({ style: s })}
                      title={s}
                      className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                        (element.outline?.style ?? 'solid') === s
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {s === 'solid' ? '—' : s === 'dashed' ? '- -' : '···'}
                    </button>
                  ))}
                </div>
              </Row>
            </>
          )}
        </div>
      </Section>
    </>
  );
}
