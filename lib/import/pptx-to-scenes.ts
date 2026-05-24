import { nanoid } from 'nanoid';
import type {
  Slide as PptxSlide,
  Element as PptxElement,
  Shape as PptxShape,
  Text as PptxText,
  Image as PptxImage,
  Table as PptxTable,
  Group as PptxGroup,
  Fill,
  ColorFill,
  GradientFill,
  ImageFill,
} from 'pptxtojson';
import type { Scene } from '@/lib/types/stage';
import type {
  Slide as MicaSlide,
  PPTElement,
  PPTTextElement,
  PPTImageElement,
  PPTShapeElement,
  PPTTableElement,
  SlideBackground,
  SlideTheme,
  Gradient,
  ShapeText,
  TableCell as MicaTableCell,
  PPTElementOutline,
  PPTElementShadow,
} from '@/lib/types/slides';

// ─── Constants ───────────────────────────────────────────────────────────────

const VIEWPORT_SIZE = 1000;
const VIEWPORT_RATIO = 0.5625;
const VIEWPORT_HEIGHT = VIEWPORT_SIZE * VIEWPORT_RATIO; // 562.5

// ─── Fill helpers ────────────────────────────────────────────────────────────

function extractSolidColor(fill: Fill | undefined): string {
  if (!fill || fill.type !== 'color') return '#ffffff';
  return (fill as ColorFill).value;
}

function convertGradient(fill: GradientFill): Gradient {
  return {
    type: fill.value.path === 'circle' ? 'radial' : 'linear',
    colors: fill.value.colors.map((c) => ({
      pos: Number(c.pos),
      color: c.color,
    })),
    rotate: fill.value.rot,
  };
}

function convertBackground(fill: Fill | undefined): SlideBackground | undefined {
  if (!fill) return undefined;
  if (fill.type === 'color') {
    return { type: 'solid', color: (fill as ColorFill).value };
  }
  if (fill.type === 'gradient') {
    return { type: 'gradient', gradient: convertGradient(fill as GradientFill) };
  }
  if (fill.type === 'image') {
    const imgFill = fill as ImageFill;
    return {
      type: 'image',
      image: { src: `data:image/png;base64,${imgFill.value.picBase64}`, size: 'cover' },
    };
  }
  return undefined;
}

// ─── Outline / shadow ────────────────────────────────────────────────────────

function convertOutline(
  borderColor: string,
  borderWidth: number,
  borderType: string,
): PPTElementOutline | undefined {
  if (!borderWidth || borderWidth <= 0) return undefined;
  return {
    color: borderColor,
    width: borderWidth,
    style: borderType as 'solid' | 'dashed' | 'dotted',
  };
}

function convertShadow(
  shadow: { h: number; v: number; blur: number; color: string } | undefined,
): PPTElementShadow | undefined {
  if (!shadow) return undefined;
  return { h: shadow.h, v: shadow.v, blur: shadow.blur, color: shadow.color };
}

// ─── Coordinate scaling ───────────────────────────────────────────────────────

interface Scale {
  scaleX: number;
  scaleY: number;
}

function makeBase(
  el: { left: number; top: number; width: number; height: number; rotate?: number },
  { scaleX, scaleY }: Scale,
) {
  return {
    id: nanoid(),
    left: Math.round(el.left * scaleX * 10) / 10,
    top: Math.round(el.top * scaleY * 10) / 10,
    width: Math.max(1, Math.round(el.width * scaleX * 10) / 10),
    height: Math.max(1, Math.round(el.height * scaleY * 10) / 10),
    rotate: el.rotate ?? 0,
  };
}

// ─── Text ────────────────────────────────────────────────────────────────────

function convertText(el: PptxText, scale: Scale): PPTTextElement {
  return {
    ...makeBase(el, scale),
    type: 'text',
    content: el.content,
    defaultFontName: 'Microsoft YaHei',
    defaultColor: '#333333',
    fill: el.fill?.type === 'color' ? (el.fill as ColorFill).value : undefined,
    outline: convertOutline(el.borderColor, el.borderWidth, el.borderType),
    shadow: convertShadow(el.shadow),
    vertical: el.isVertical,
  };
}

// ─── Image ───────────────────────────────────────────────────────────────────

function convertImage(el: PptxImage, scale: Scale): PPTImageElement {
  return {
    ...makeBase(el, scale),
    type: 'image',
    src: el.src,
    fixedRatio: true,
    flipH: el.isFlipH || undefined,
    flipV: el.isFlipV || undefined,
    outline: convertOutline(el.borderColor, el.borderWidth, el.borderType),
    filters: el.filters
      ? {
          brightness: el.filters.brightness !== undefined ? `${el.filters.brightness}%` : undefined,
          contrast: el.filters.contrast !== undefined ? `${el.filters.contrast}%` : undefined,
          saturate: el.filters.saturation !== undefined ? `${el.filters.saturation}%` : undefined,
        }
      : undefined,
  };
}

// ─── Shape ───────────────────────────────────────────────────────────────────

function getBasicShapePath(shapType: string): string | null {
  const t = (shapType ?? '').toLowerCase();
  if (t === 'rect' || t === 'rectangle' || t === '') {
    return 'M 0 0 L 200 0 L 200 200 L 0 200 Z';
  }
  if (t === 'ellipse' || t === 'oval' || t === 'circle') {
    return 'M 100 0 C 155.228 0 200 44.772 200 100 C 200 155.228 155.228 200 100 200 C 44.772 200 0 155.228 0 100 C 0 44.772 44.772 0 100 0 Z';
  }
  if (t === 'roundrect' || t === 'roundrectangle') {
    return 'M 20 0 L 180 0 Q 200 0 200 20 L 200 180 Q 200 200 180 200 L 20 200 Q 0 200 0 180 L 0 20 Q 0 0 20 0 Z';
  }
  if (t === 'triangle' || t === 'isoscelestriangle') {
    return 'M 100 0 L 200 200 L 0 200 Z';
  }
  if (t === 'righttriangle') {
    return 'M 0 0 L 200 200 L 0 200 Z';
  }
  if (t === 'diamond' || t === 'rhombus') {
    return 'M 100 0 L 200 100 L 100 200 L 0 100 Z';
  }
  if (t === 'parallelogram') {
    return 'M 25 0 L 200 0 L 175 200 L 0 200 Z';
  }
  if (t === 'trapezoid') {
    return 'M 25 0 L 175 0 L 200 200 L 0 200 Z';
  }
  if (t === 'pentagon') {
    return 'M 100 0 L 200 75 L 162 200 L 38 200 L 0 75 Z';
  }
  if (t === 'hexagon') {
    return 'M 50 0 L 150 0 L 200 100 L 150 200 L 50 200 L 0 100 Z';
  }
  return null;
}

function mapVAlign(vAlign: string): 'top' | 'middle' | 'bottom' {
  if (vAlign === 'top') return 'top';
  if (vAlign === 'bottom') return 'bottom';
  return 'middle';
}

function convertShape(el: PptxShape, scale: Scale): PPTElement | null {
  const base = makeBase(el, scale);
  const hasText = Boolean(el.content?.trim());
  const path = el.path ?? getBasicShapePath(el.shapType);

  if (!path) {
    // No path: fall back to text element if there's content
    if (hasText) {
      return {
        ...base,
        type: 'text',
        content: el.content,
        defaultFontName: 'Microsoft YaHei',
        defaultColor: '#333333',
        fill: el.fill?.type === 'color' ? (el.fill as ColorFill).value : undefined,
      } as PPTTextElement;
    }
    return null;
  }

  const fillColor = extractSolidColor(el.fill);
  const shapeText: ShapeText | undefined = hasText
    ? {
        content: el.content,
        defaultFontName: 'Microsoft YaHei',
        defaultColor: '#333333',
        align: mapVAlign(el.vAlign),
      }
    : undefined;

  const shapeEl: PPTShapeElement = {
    ...base,
    type: 'shape',
    viewBox: [200, 200],
    path,
    fixedRatio: false,
    fill: fillColor,
    flipH: el.isFlipH || undefined,
    flipV: el.isFlipV || undefined,
    outline: convertOutline(el.borderColor, el.borderWidth, el.borderType),
    shadow: convertShadow(el.shadow),
    text: shapeText,
  };

  if (el.fill?.type === 'gradient') {
    shapeEl.gradient = convertGradient(el.fill as GradientFill);
  }

  return shapeEl;
}

// ─── Table ───────────────────────────────────────────────────────────────────

function convertTable(el: PptxTable, scale: Scale): PPTTableElement {
  const base = makeBase({ ...el, rotate: 0 }, scale);

  const totalColWidth = el.colWidths.reduce((sum, w) => sum + w, 0) || 1;
  const colWidths = el.colWidths.map((w) => w / totalColWidth);

  const data: MicaTableCell[][] = el.data.map((row) =>
    row.map((cell) => ({
      id: nanoid(),
      colspan: cell.colSpan ?? 1,
      rowspan: cell.rowSpan ?? 1,
      text: cell.text ?? '',
      style: {
        bold: cell.fontBold || undefined,
        color: cell.fontColor || undefined,
        backcolor: cell.fillColor || undefined,
      },
    })),
  );

  return {
    ...base,
    type: 'table',
    outline: { style: 'solid', color: '#ececec', width: 1 },
    colWidths,
    cellMinHeight: 36,
    data,
  };
}

// ─── Group (flatten) ─────────────────────────────────────────────────────────

function flattenGroup(group: PptxGroup, scale: Scale): PPTElement[] {
  // pptxtojson returns child coordinates already in slide space
  return group.elements.flatMap((child) => {
    const converted = convertElement(child as PptxElement, scale);
    return converted ?? [];
  });
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

function convertElement(el: PptxElement, scale: Scale): PPTElement | PPTElement[] | null {
  try {
    if (el.type === 'text') return convertText(el as PptxText, scale);
    if (el.type === 'image') return convertImage(el as PptxImage, scale);
    if (el.type === 'shape') return convertShape(el as PptxShape, scale);
    if (el.type === 'table') return convertTable(el as PptxTable, scale);
    if (el.type === 'group') return flattenGroup(el as unknown as PptxGroup, scale);
    return null;
  } catch {
    return null;
  }
}

// ─── Title extraction ─────────────────────────────────────────────────────────

function extractPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSlideTitle(slide: PptxSlide, index: number): string {
  for (const el of slide.elements) {
    if (el.type === 'text') {
      const textEl = el as PptxText;
      const plain = extractPlainText(textEl.content ?? '');
      if (plain.length > 0) {
        return plain.slice(0, 60);
      }
    }
  }
  return `Slide ${index + 1}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function pptxToScenes(
  slides: PptxSlide[],
  themeColors: string[],
  size: { width: number; height: number },
  stageId: string,
): { scenes: Scene[]; thumbnailCanvas: MicaSlide | null } {
  const scaleX = VIEWPORT_SIZE / size.width;
  const scaleY = VIEWPORT_HEIGHT / size.height;
  const scale: Scale = { scaleX, scaleY };

  const normalizedThemeColors = [...themeColors.slice(0, 5)];
  while (normalizedThemeColors.length < 5) normalizedThemeColors.push('#5b9bd5');

  const now = Date.now();

  const scenes: Scene[] = slides.map((slide, index) => {
    const background = convertBackground(slide.fill);
    const bgColor = background?.type === 'solid' ? (background.color ?? '#ffffff') : '#ffffff';

    const theme: SlideTheme = {
      backgroundColor: bgColor,
      themeColors: normalizedThemeColors,
      fontColor: '#333333',
      fontName: 'Microsoft YaHei',
    };

    const convertAll = (els: PptxElement[]): PPTElement[] =>
      els.flatMap((el) => {
        const result = convertElement(el, scale);
        if (!result) return [];
        return Array.isArray(result) ? result : [result];
      });

    // layoutElements are slide-master/layout decorations — render them first (behind)
    const elements: PPTElement[] = [
      ...convertAll(slide.layoutElements as unknown as PptxElement[]),
      ...convertAll(slide.elements),
    ];

    const canvas: MicaSlide = {
      id: nanoid(),
      viewportSize: VIEWPORT_SIZE,
      viewportRatio: VIEWPORT_RATIO,
      theme,
      elements,
      background,
    };

    return {
      id: nanoid(),
      stageId,
      type: 'slide' as const,
      title: extractSlideTitle(slide, index),
      order: index,
      content: { type: 'slide' as const, canvas },
      createdAt: now,
      updatedAt: now,
    };
  });

  const firstScene = scenes[0];
  const thumbnailCanvas = firstScene?.content?.type === 'slide' ? firstScene.content.canvas : null;

  return { scenes, thumbnailCanvas };
}
