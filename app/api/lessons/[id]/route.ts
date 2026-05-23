import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/mica';

type Params = { params: Promise<{ id: string }> };

// GET /api/lessons/:id — load full lesson data
export async function GET(_req: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  try {
    const { id } = await params;
    const rows = await sql`SELECT data FROM lessons WHERE id = ${id}`;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0].data);
  } catch (err) {
    console.error('[lessons] load failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/lessons/:id — update lesson (full data or metadata-only patch)
export async function PUT(req: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, data, scene_count, interactive_mode } = body as {
      title?: string;
      description?: string;
      data?: unknown;
      scene_count?: number;
      interactive_mode?: boolean;
    };

    if (data !== undefined) {
      // Full update
      await sql`
        UPDATE lessons SET
          title          = ${title ?? sql`title`},
          description    = ${description ?? null},
          data           = ${JSON.stringify(data)},
          scene_count    = ${scene_count ?? 0},
          interactive_mode = ${interactive_mode ?? false},
          updated_at     = now()
        WHERE id = ${id}
      `;
    } else {
      // Metadata-only patch (e.g. rename)
      await sql`
        UPDATE lessons SET
          title       = ${title ?? sql`title`},
          description = ${description !== undefined ? description : sql`description`},
          updated_at  = now()
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[lessons] update failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/lessons/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  try {
    const { id } = await params;
    await sql`DELETE FROM lessons WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[lessons] delete failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
