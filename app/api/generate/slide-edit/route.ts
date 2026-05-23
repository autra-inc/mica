import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { callLLM } from '@/lib/ai/llm';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { Slide } from '@/lib/types/slides';

export const maxDuration = 60;

type SlideOp =
  | { op: 'add'; element: Record<string, unknown> }
  | { op: 'update'; id: string; props: Record<string, unknown> }
  | { op: 'delete'; id: string };

function summarizeSlide(slide: Slide): string {
  const lines = slide.elements.map((el) => {
    const pos = `(${Math.round(el.left)}, ${Math.round(el.top)})`;
    const size = `${Math.round(el.width)}×${'height' in el ? Math.round((el as { height: number }).height) : '?'}`;
    let extra = '';
    if (el.type === 'text') {
      const plain = el.content
        .replace(/<[^>]+>/g, '')
        .trim()
        .slice(0, 120);
      if (plain) extra = `, text: "${plain}"`;
    } else if (el.type === 'shape' && el.text) {
      const plain =
        el.text.content
          ?.replace(/<[^>]+>/g, '')
          .trim()
          .slice(0, 80) ?? '';
      if (plain) extra = `, text: "${plain}"`;
    } else if (el.type === 'table') {
      extra = `, rows: ${el.data.length}, cols: ${el.data[0]?.length ?? 0}`;
    } else if (el.type === 'image') {
      extra = '';
    }
    return `  { id: "${el.id}", type: "${el.type}", pos: ${pos}, size: ${size}${extra} }`;
  });
  return lines.length ? lines.join('\n') : '  (no elements)';
}

const SYSTEM_PROMPT = `You are a slide editor assistant. You modify presentation slides by returning structured JSON operations.

Respond ONLY with a valid JSON object — no markdown, no explanation, nothing else.

Available operations:
1. Add a new text box:
   { "op": "add", "element": { "type": "text", "left": <px>, "top": <px>, "width": <px>, "height": <px>, "rotate": 0, "content": "<p>your text here</p>", "defaultFontName": "", "defaultColor": "#333333" } }

2. Update an existing element's properties:
   { "op": "update", "id": "<existing-element-id>", "props": { "content": "<p>new text</p>" } }

3. Delete an element:
   { "op": "delete", "id": "<existing-element-id>" }

Rules:
- Only reference IDs that appear in the current slide elements list
- Text content must use HTML: wrap each paragraph in <p>...</p>
- All positions and sizes are in pixels; keep elements within the slide bounds
- Return { "ops": [ ...operations ] }`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, slide } = body as { prompt: string; slide: Slide };

    if (!prompt?.trim()) return apiError('MISSING_REQUIRED_FIELD', 400, 'prompt is required');
    if (!slide) return apiError('MISSING_REQUIRED_FIELD', 400, 'slide is required');

    const { model } = await resolveModelFromRequest(req, body);

    const viewportW = slide.viewportSize ?? 1000;
    const viewportH = Math.round(viewportW * (slide.viewportRatio ?? 0.5625));

    const userMessage = `Slide viewport: ${viewportW}×${viewportH}px

Current elements:
${summarizeSlide(slide)}

User request: ${prompt}`;

    const result = await callLLM(
      { model, system: SYSTEM_PROMPT, prompt: userMessage, maxTokens: 1024 },
      'slide-edit',
    );

    const raw = result.text.trim();
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      return apiError('GENERATION_FAILED', 500, 'Model did not return JSON');
    }

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as { ops?: SlideOp[] };
    const ops = (parsed.ops ?? []).map((op) => {
      if (op.op === 'add') {
        return { ...op, element: { ...op.element, id: nanoid(10) } };
      }
      return op;
    });

    return apiSuccess({ ops });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return apiError('INTERNAL_ERROR', 500, msg);
  }
}
