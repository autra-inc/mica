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
    const pos = `left:${Math.round(el.left)}, top:${Math.round(el.top)}`;
    const size = `width:${Math.round(el.width)}, height:${'height' in el ? Math.round((el as { height: number }).height) : '?'}`;
    const parts: string[] = [`id:"${el.id}"`, `type:"${el.type}"`, pos, size];

    if (el.type === 'text') {
      const plain = el.content.replace(/<[^>]+>/g, '').trim().slice(0, 120);
      if (plain) parts.push(`text:"${plain}"`);
      if (el.defaultFontName) parts.push(`font:"${el.defaultFontName}"`);
      if (el.defaultColor) parts.push(`color:"${el.defaultColor}"`);
    } else if (el.type === 'shape') {
      parts.push(`fill:"${el.fill}"`);
      if (el.text?.content) {
        const plain = el.text.content.replace(/<[^>]+>/g, '').trim().slice(0, 80);
        if (plain) parts.push(`text:"${plain}"`);
      }
    } else if (el.type === 'image') {
      parts.push('(image)');
    } else if (el.type === 'table') {
      parts.push(`rows:${el.data.length}, cols:${el.data[0]?.length ?? 0}`);
    }

    return `  { ${parts.join(', ')} }`;
  });
  return lines.length ? lines.join('\n') : '  (no elements)';
}

const SYSTEM_PROMPT = `You are a slide editor assistant. Modify presentation slides by returning structured JSON operations.

Respond ONLY with a valid JSON object — no markdown, no explanation, nothing else.

=== OPERATIONS ===

1. ADD a new text box:
{ "op": "add", "element": { "type": "text", "left": 50, "top": 50, "width": 400, "height": 80, "rotate": 0, "content": "<p>Hello</p>", "defaultFontName": "Inter", "defaultColor": "#333333" } }

2. UPDATE an existing element — only include the props you want to change:
{ "op": "update", "id": "<id>", "props": { ... } }

3. DELETE an element:
{ "op": "delete", "id": "<id>" }

=== UPDATABLE PROPERTIES ===

For ALL elements (rearranging / resizing):
  "left", "top", "width", "height"  — positions and sizes in pixels

For text elements:
  "content"           — HTML string, wrap paragraphs in <p>...</p>, e.g. "<p>New title</p>"
  "defaultFontName"   — font family, e.g. "Inter", "Roboto", "Georgia"
  "defaultColor"      — hex color for text, e.g. "#1a1a1a"
  "fill"              — background fill color of the text box, e.g. "#f0f0f0" (use "" for none)
  "opacity"           — 0 to 1

For shape elements:
  "fill"              — fill color, e.g. "#4A90D9"
  "opacity"           — 0 to 1

=== REARRANGING LAYOUT ===
To rearrange elements, update their "left" and "top" (and optionally "width"/"height").
Example — move element to top-left and resize:
{ "op": "update", "id": "abc", "props": { "left": 40, "top": 30, "width": 500, "height": 120 } }

=== STYLE CHANGES ===
To change text color: { "op": "update", "id": "...", "props": { "defaultColor": "#e74c3c" } }
To change font: { "op": "update", "id": "...", "props": { "defaultFontName": "Playfair Display" } }
To change shape color: { "op": "update", "id": "...", "props": { "fill": "#2ecc71" } }

=== RULES ===
- Only reference IDs that appear in the current slide elements list
- Keep all elements within slide bounds (0,0) to (viewportW, viewportH)
- Return { "ops": [ ...one or more operations... ] }
- If nothing needs to change, return { "ops": [] }

=== TEXT OPERATIONS ===
"Expand" = rewrite text element content with more detail, longer paragraphs
"Compress" / "Summarize" = rewrite text element content as concise bullet points using <ul><li>...</li></ul>
"Polish" / "Fix" = correct grammar, improve clarity, keep the same meaning and length
When the user asks to expand/compress/polish, apply it to the relevant text element(s) via "update" ops.`;

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
