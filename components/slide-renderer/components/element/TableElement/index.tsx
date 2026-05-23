'use client';

import { useCallback } from 'react';
import type { PPTTableElement } from '@/lib/types/slides';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import { useHistorySnapshot } from '@/lib/hooks/use-history-snapshot';
import { StaticTable } from './StaticTable';
import { EditableTable } from './EditableTable';

export { BaseTableElement } from './BaseTableElement';

export interface TableElementProps {
  elementInfo: PPTTableElement;
  selectElement?: (e: React.MouseEvent | React.TouchEvent, element: PPTTableElement) => void;
  editable?: boolean;
}

export function TableElement({ elementInfo, selectElement, editable = false }: TableElementProps) {
  const { updateElement } = useCanvasOperations();
  const { addHistorySnapshot } = useHistorySnapshot();

  const handleSelectElement = (e: React.MouseEvent | React.TouchEvent) => {
    if (elementInfo.lock) return;
    e.stopPropagation();
    selectElement?.(e, elementInfo);
  };

  const handleCellUpdate = useCallback(
    (rowIdx: number, colIdx: number, text: string) => {
      const newData = elementInfo.data.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          rIdx === rowIdx && cIdx === colIdx ? { ...cell, text } : cell,
        ),
      );
      updateElement({ id: elementInfo.id, props: { data: newData } as Partial<PPTTableElement> });
      addHistorySnapshot();
    },
    [elementInfo, updateElement, addHistorySnapshot],
  );

  return (
    <div
      className={`editable-element-table absolute ${elementInfo.lock ? 'lock' : ''}`}
      style={{
        top: `${elementInfo.top}px`,
        left: `${elementInfo.left}px`,
        width: `${elementInfo.width}px`,
        height: `${elementInfo.height}px`,
      }}
    >
      <div
        className="rotate-wrapper w-full h-full"
        style={{ transform: `rotate(${elementInfo.rotate}deg)` }}
      >
        <div
          className={`element-content relative w-full h-full overflow-hidden ${
            elementInfo.lock ? 'cursor-default' : 'cursor-move'
          }`}
          onMouseDown={handleSelectElement}
          onTouchStart={handleSelectElement}
        >
          {editable && !elementInfo.lock ? (
            <EditableTable elementInfo={elementInfo} onCellUpdate={handleCellUpdate} />
          ) : (
            <StaticTable elementInfo={elementInfo} />
          )}
        </div>
      </div>
    </div>
  );
}
