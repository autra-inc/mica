import { NextRequest } from 'next/server';
import { parse } from 'pptxtojson';
import { nanoid } from 'nanoid';
import sql from '@/lib/db/mica';
import { pptxToScenes } from '@/lib/import/pptx-to-scenes';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { Stage } from '@/lib/types/stage';
import type { StageStoreData } from '@/lib/utils/stage-storage';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sql) return apiError('INTERNAL_ERROR', 503, 'DB not configured');

  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return apiError('INVALID_REQUEST', 400, 'multipart/form-data required');
    }

    const formData = await req.formData();
    const file = formData.get('pptx') as File | null;
    if (!file) return apiError('MISSING_REQUIRED_FIELD', 400, 'pptx file required');
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      return apiError('INVALID_REQUEST', 400, 'file must be a .pptx file');
    }

    const arrayBuffer = await file.arrayBuffer();
    const { slides, themeColors, size } = await parse(arrayBuffer);

    if (!slides.length) {
      return apiError('INVALID_REQUEST', 400, 'No slides found in PPTX');
    }

    const lessonId = nanoid();
    const title = file.name.replace(/\.pptx$/i, '').trim() || 'Imported Deck';

    const { scenes, thumbnailCanvas } = pptxToScenes(slides, themeColors, size, lessonId);

    const stage: Stage = {
      id: lessonId,
      name: title,
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const data: StageStoreData = {
      stage,
      scenes,
      currentSceneId: scenes[0]?.id ?? null,
      chats: [],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataJson = sql!.json(data as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thumbnailJson = thumbnailCanvas ? sql!.json(thumbnailCanvas as any) : null;

    await sql`
      INSERT INTO lessons (id, title, description, data, created_by, scene_count, interactive_mode, thumbnail_data)
      VALUES (
        ${lessonId},
        ${title},
        ${''},
        ${dataJson},
        ${''},
        ${scenes.length},
        ${false},
        ${thumbnailJson}
      )
    `;

    return apiSuccess({ id: lessonId, title, sceneCount: scenes.length });
  } catch (err) {
    console.error('[import-pptx] failed:', err);
    return apiError('INTERNAL_ERROR', 500, 'Failed to import PPTX');
  }
}
