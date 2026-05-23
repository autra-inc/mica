import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { Slide } from '@/lib/types/slides';

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a presenter notes assistant. Generate concise speaker notes for this slide. The notes should help an instructor deliver the content naturally in 2-4 sentences. Focus on key talking points, transitions, and anything not immediately obvious from the slide itself. Respond with plain text only — no markdown, no bullet points.`;

function summarizeSlide(slide: Slide): string {
  const lines = slide.elements.map((el) => {
    const pos = `left:${Math.round(el.left)}, top:${Math.round(el.top)}`;
    const size = `width:${Math.round(el.width)}, height:${'height' in el ? Math.round((el as { height: number }).height) : '?'}`;
    const parts: string[] = [`type:"${el.type}"`, pos, size];

    if (el.type === 'text') {
      const plain = el.content.replace(/<[^>]+>/g, '').trim().slice(0, 200);
      if (plain) parts.push(`text:"${plain}"`);
    } else if (el.type === 'shape') {
      if (el.text?.content) {
        const plain = el.text.content.replace(/<[^>]+>/g, '').trim().slice(0, 100);
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slide } = body as { slide: Slide };

    if (!slide) return apiError('MISSING_REQUIRED_FIELD', 400, 'slide is required');

    const { model } = await resolveModelFromRequest(req, body);

    const summary = summarizeSlide(slide);
    const userMessage = `Slide elements:\n${summary}\n\nGenerate presenter notes for this slide.`;

    const result = await callLLM(
      { model, system: SYSTEM_PROMPT, prompt: userMessage, maxTokens: 512 },
      'slide-notes',
    );

    return apiSuccess({ notes: result.text.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return apiError('INTERNAL_ERROR', 500, msg);
  }
}
