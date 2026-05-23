/**
 * Cloud lesson storage — thin fetch wrapper around /api/lessons.
 * All functions fail silently so local IndexedDB always works as fallback.
 */

import type { StageStoreData, StageListItem } from './stage-storage';
import type { Stage } from '../types/stage';
import { extractAndUploadMedia } from './media-extractor';

export interface CloudLesson {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  scene_count: number;
  interactive_mode: boolean;
  created_at: string;
  updated_at: string;
}

export async function cloudListLessons(): Promise<CloudLesson[]> {
  try {
    const res = await fetch('/api/lessons');
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function cloudLoadLesson(id: string): Promise<StageStoreData | null> {
  try {
    const res = await fetch(`/api/lessons/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function cloudSaveLesson(id: string, data: StageStoreData): Promise<void> {
  try {
    const stage = data.stage as Stage & { interactiveMode?: boolean };
    const uploadedData = await extractAndUploadMedia(id, data);
    await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        title: stage.name || 'Untitled',
        description: stage.description,
        data: {
          stage: uploadedData.stage,
          scenes: uploadedData.scenes,
          currentSceneId: uploadedData.currentSceneId,
        },
        created_by: '',
        scene_count: data.scenes.length,
        interactive_mode: stage.interactiveMode ?? false,
      }),
    });
  } catch {
    // Cloud sync is best-effort — local save already succeeded
  }
}

export async function cloudDeleteLesson(id: string): Promise<void> {
  try {
    await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
  } catch {
    // Best-effort
  }
}

export async function cloudRenameLesson(id: string, title: string): Promise<void> {
  try {
    await fetch(`/api/lessons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  } catch {
    // Best-effort
  }
}

/** Convert a CloudLesson metadata row to StageListItem for the home page */
export function cloudLessonToListItem(l: CloudLesson): StageListItem {
  return {
    id: l.id,
    name: l.title,
    description: l.description,
    sceneCount: l.scene_count,
    interactiveMode: l.interactive_mode,
    createdAt: new Date(l.created_at).getTime(),
    updatedAt: new Date(l.updated_at).getTime(),
  };
}
