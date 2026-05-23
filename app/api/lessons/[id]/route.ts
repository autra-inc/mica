import { NextRequest, NextResponse } from 'next/server';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import sql from '@/lib/db/mica';
import s3 from '@/lib/s3/mica';

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
    const { title, description, data, scene_count, interactive_mode, thumbnail_data } = body as {
      title?: string;
      description?: string;
      data?: unknown;
      scene_count?: number;
      interactive_mode?: boolean;
      thumbnail_data?: unknown;
    };

    if (data !== undefined) {
      // Full update
      await sql`
        UPDATE lessons SET
          title          = ${title ?? sql`title`},
          description    = ${description ?? null},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data           = ${sql!.json(data as any)},
          scene_count    = ${scene_count ?? 0},
          interactive_mode = ${interactive_mode ?? false},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thumbnail_data = ${thumbnail_data != null ? sql!.json(thumbnail_data as any) : null},
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

    // Best-effort S3 cleanup — delete all media uploaded for this lesson
    const bucket = process.env.MICA_MEDIA_BUCKET;
    if (s3 && bucket) {
      const prefix = `lesson-${id}/`;
      const listed = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
      const objects = listed.Contents?.map((o) => ({ Key: o.Key! })) ?? [];
      if (objects.length) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objects, Quiet: true },
          }),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[lessons] delete failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
