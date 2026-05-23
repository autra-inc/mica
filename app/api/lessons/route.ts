import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/mica';

// GET /api/lessons — list all lessons (metadata + inline thumbnail, no full scene data)
export async function GET() {
  if (!sql) return NextResponse.json([]);
  try {
    const rows = await sql`
      SELECT id, title, description, created_by, scene_count, interactive_mode,
             thumbnail_data, created_at, updated_at
      FROM lessons
      ORDER BY updated_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[lessons] list failed:', err);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/lessons — create a new lesson
export async function POST(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  try {
    const body = await req.json();
    const {
      id,
      title,
      description,
      data,
      created_by,
      scene_count,
      interactive_mode,
      thumbnail_data,
    } = body as {
      id: string;
      title?: string;
      description?: string;
      data: unknown;
      created_by?: string;
      scene_count?: number;
      interactive_mode?: boolean;
      thumbnail_data?: unknown;
    };

    if (!id || !data) {
      return NextResponse.json({ error: 'id and data are required' }, { status: 400 });
    }

    await sql`
      INSERT INTO lessons (id, title, description, data, created_by, scene_count, interactive_mode, thumbnail_data)
      VALUES (
        ${id},
        ${title ?? 'Untitled'},
        ${description ?? null},
        ${JSON.stringify(data)},
        ${created_by ?? ''},
        ${scene_count ?? 0},
        ${interactive_mode ?? false},
        ${thumbnail_data ? JSON.stringify(thumbnail_data) : null}
      )
      ON CONFLICT (id) DO UPDATE SET
        title          = EXCLUDED.title,
        description    = EXCLUDED.description,
        data           = EXCLUDED.data,
        created_by     = EXCLUDED.created_by,
        scene_count    = EXCLUDED.scene_count,
        interactive_mode = EXCLUDED.interactive_mode,
        thumbnail_data = EXCLUDED.thumbnail_data,
        updated_at     = now()
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[lessons] create failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
