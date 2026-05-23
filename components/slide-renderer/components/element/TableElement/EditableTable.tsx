'use client';

import { useMemo, useState, useCallback } from 'react';
import type { PPTTableElement } from '@/lib/types/slides';
import { getTableSubThemeColor } from '@/lib/utils/element';
import { getTextStyle, formatText, getHiddenCells } from './tableUtils';

interface EditableTableProps {
  elementInfo: PPTTableElement;
  onCellUpdate: (rowIdx: number, colIdx: number, text: string) => void;
}

export function EditableTable({ elementInfo, onCellUpdate }: EditableTableProps) {
  const [editingCellId, setEditingCellId] = useState<string | null>(null);

  const { width, data, colWidths, cellMinHeight, outline, theme } = elementInfo;

  const hiddenCells = useMemo(() => getHiddenCells(data), [data]);

  const [subThemeDark, subThemeLight] = useMemo(() => {
    if (!theme) return ['', ''];
    return getTableSubThemeColor(theme.color);
  }, [theme]);

  const borderStyle = useMemo(() => {
    if (!outline) return 'none';
    const w = outline.width ?? 1;
    const c = outline.color ?? '#000';
    const s = outline.style === 'dashed' ? 'dashed' : 'solid';
    return `${w}px ${s} ${c}`;
  }, [outline]);

  const getCellBg = useCallback(
    (rowIdx: number, colIdx: number, cellBackcolor?: string): string | undefined => {
      if (cellBackcolor) return cellBackcolor;
      if (!theme) return undefined;
      const rowCount = data.length;
      const colCount = data[0]?.length ?? 0;
      if (theme.rowHeader && rowIdx === 0) return theme.color;
      if (theme.rowFooter && rowIdx === rowCount - 1) return theme.color;
      if (theme.colHeader && colIdx === 0) return subThemeDark;
      if (theme.colFooter && colIdx === colCount - 1) return subThemeDark;
      const effectiveRow = theme.rowHeader ? rowIdx - 1 : rowIdx;
      if (effectiveRow >= 0 && effectiveRow % 2 === 0) return subThemeLight;
      return undefined;
    },
    [data, theme, subThemeDark, subThemeLight],
  );

  const getHeaderTextColor = useCallback(
    (rowIdx: number): string | undefined => {
      if (!theme) return undefined;
      const rowCount = data.length;
      if (theme.rowHeader && rowIdx === 0) return '#fff';
      if (theme.rowFooter && rowIdx === rowCount - 1) return '#fff';
      return undefined;
    },
    [data, theme],
  );

  return (
    <table className="w-full h-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <colgroup>
        {colWidths.map((w, i) => (
          <col key={i} style={{ width: `${w * width}px` }} />
        ))}
      </colgroup>
      <tbody>
        {data.map((row, rowIdx) => (
          <tr key={rowIdx} style={{ height: `${cellMinHeight}px` }}>
            {row.map((cell, colIdx) => {
              if (hiddenCells.has(`${rowIdx}_${colIdx}`)) return null;

              const isEditing = editingCellId === cell.id;
              const bgColor = getCellBg(rowIdx, colIdx, cell.style?.backcolor);
              const headerColor = getHeaderTextColor(rowIdx);
              const textStyle = getTextStyle(cell.style);
              if (headerColor && !cell.style?.color) textStyle.color = headerColor;

              return (
                <td
                  key={cell.id}
                  colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                  rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingCellId(cell.id);
                  }}
                  style={{
                    border: borderStyle,
                    backgroundColor: bgColor,
                    verticalAlign: 'middle',
                    wordBreak: 'break-word',
                    position: 'relative',
                    padding: isEditing ? 0 : '5px',
                    cursor: isEditing ? 'text' : 'default',
                    ...(!isEditing ? textStyle : {}),
                  }}
                >
                  {isEditing ? (
                    <textarea
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      defaultValue={cell.text}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Escape') e.currentTarget.blur();
                        if (e.key === 'Enter' && !e.shiftKey) e.currentTarget.blur();
                      }}
                      onBlur={(e) => {
                        onCellUpdate(rowIdx, colIdx, e.target.value);
                        setEditingCellId(null);
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        padding: '5px',
                        resize: 'none',
                        border: '2px solid #5b5ea6',
                        outline: 'none',
                        backgroundColor: bgColor ?? '#fff',
                        boxSizing: 'border-box',
                        ...textStyle,
                      }}
                    />
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: cell.text ? formatText(cell.text) : '&nbsp;',
                      }}
                    />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
