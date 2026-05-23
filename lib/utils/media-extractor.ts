/**
 * Before saving a lesson to the cloud, walks all slide/whiteboard elements and
 * replaces embedded base64 data URLs with permanent S3 URLs via /api/media.
 *
 * Leaves non-data: URLs (https://, blob:, etc.) unchanged.
 * All uploads fail silently — worst case the lesson retains base64 inline data.
 */

import type { StageStoreData } from './stage-storage';
import type { Whiteboard } from '../types/stage';
import type { Slide } from '../types/slides';

type SlideOrWhiteboard = Slide | Whiteboard;

export async function extractAndUploadMedia(
  lessonId: string,
  data: StageStoreData,
): Promise<StageStoreData> {
  const cloned = JSON.parse(JSON.stringify(data)) as StageStoreData;

  for (const scene of cloned.scenes) {
    if (scene.content.type === 'slide') {
      await processSlide(lessonId, scene.content.canvas as SlideOrWhiteboard);
    }
    if (scene.whiteboards) {
      for (const wb of scene.whiteboards) {
        await processSlide(lessonId, wb as SlideOrWhiteboard);
      }
    }
  }

  if (cloned.stage.whiteboard) {
    for (const wb of cloned.stage.whiteboard) {
      await processSlide(lessonId, wb);
    }
  }

  return cloned;
}

async function processSlide(lessonId: string, slide: SlideOrWhiteboard) {
  if (slide.background?.image?.src) {
    slide.background.image.src = await maybeUpload(lessonId, slide.background.image.src);
  }
  for (const el of slide.elements) {
    if ('src' in el && typeof el.src === 'string') {
      (el as { src: string }).src = await maybeUpload(lessonId, el.src);
    }
  }
}

async function maybeUpload(lessonId: string, src: string): Promise<string> {
  if (!src.startsWith('data:')) return src;
  try {
    const res = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, dataUrl: src }),
    });
    if (!res.ok) return src;
    const { url } = (await res.json()) as { url?: string };
    return url ?? src;
  } catch {
    return src;
  }
}
