import { useCallback, type RefObject } from 'react';
import { nanoid } from 'nanoid';
import { useCanvasStore } from '@/lib/store';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import { useHistorySnapshot } from '@/lib/hooks/use-history-snapshot';
import type { CreateElementSelectionData } from '@/lib/types/edit';

export function useInsertFromCreateSelection(viewportRef: RefObject<HTMLElement | null>) {
  const canvasScale = useCanvasStore.use.canvasScale();
  const creatingElement = useCanvasStore.use.creatingElement();
  const setCreatingElement = useCanvasStore.use.setCreatingElement();
  const { addElement } = useCanvasOperations();
  const { addHistorySnapshot } = useHistorySnapshot();

  const formatCreateSelection = useCallback(
    (selectionData: CreateElementSelectionData) => {
      const { start, end } = selectionData;
      if (!viewportRef.current) return;
      const viewportRect = viewportRef.current.getBoundingClientRect();
      const [startX, startY] = start;
      const [endX, endY] = end;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      return {
        left: (minX - viewportRect.x) / canvasScale,
        top: (minY - viewportRect.y) / canvasScale,
        width: (maxX - minX) / canvasScale,
        height: (maxY - minY) / canvasScale,
      };
    },
    [viewportRef, canvasScale],
  );

  const formatCreateSelectionForLine = useCallback(
    (selectionData: CreateElementSelectionData) => {
      const { start, end } = selectionData;
      if (!viewportRef.current) return;
      const viewportRect = viewportRef.current.getBoundingClientRect();
      const [startX, startY] = start;
      const [endX, endY] = end;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      const width = (maxX - minX) / canvasScale;
      const height = (maxY - minY) / canvasScale;
      return {
        left: (minX - viewportRect.x) / canvasScale,
        top: (minY - viewportRect.y) / canvasScale,
        start: [startX === minX ? 0 : width, startY === minY ? 0 : height] as [number, number],
        end: [endX === minX ? 0 : width, endY === minY ? 0 : height] as [number, number],
      };
    },
    [viewportRef, canvasScale],
  );

  const insertElementFromCreateSelection = useCallback(
    (selectionData: CreateElementSelectionData) => {
      if (!creatingElement) return;

      if (creatingElement.type === 'text') {
        const pos = formatCreateSelection(selectionData);
        if (!pos) return;
        const { left, top, width, height } = pos;
        addElement({
          id: nanoid(10),
          type: 'text',
          content: '<p><span style="font-size: 24px;">Text</span></p>',
          defaultFontName: 'Inter',
          defaultColor: '#333333',
          left,
          top,
          width: Math.max(width, 100),
          height: Math.max(height, 50),
          rotate: 0,
        });
      } else if (creatingElement.type === 'shape') {
        const pos = formatCreateSelection(selectionData);
        if (!pos) return;
        const { left, top, width, height } = pos;
        const { viewBox, path, pathFormula, special } = creatingElement.data;
        addElement({
          id: nanoid(10),
          type: 'shape',
          viewBox,
          path,
          ...(pathFormula ? { pathFormula } : {}),
          ...(special ? { special } : {}),
          fixedRatio: false,
          fill: '#5b5ea6',
          left,
          top,
          width: Math.max(width, 20),
          height: Math.max(height, 20),
          rotate: 0,
        });
      } else if (creatingElement.type === 'line') {
        const pos = formatCreateSelectionForLine(selectionData);
        if (!pos) return;
        addElement({
          id: nanoid(10),
          type: 'line',
          left: pos.left,
          top: pos.top,
          width: Math.max(Math.abs(pos.end[0] - pos.start[0]), 20),
          start: pos.start,
          end: pos.end,
          style: creatingElement.data.style,
          color: '#333333',
          points: creatingElement.data.points,
        });
      }

      setCreatingElement(null);
      addHistorySnapshot();
    },
    [
      creatingElement,
      formatCreateSelection,
      formatCreateSelectionForLine,
      addElement,
      setCreatingElement,
      addHistorySnapshot,
    ],
  );

  return { formatCreateSelection, insertElementFromCreateSelection };
}
