import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import s3 from '@/lib/s3/mica';

const BUCKET = process.env.MICA_MEDIA_BUCKET;
const REGION = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-west-2';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

// POST /api/media — upload a base64 data URL to S3 and return the public URL
export async function POST(req: NextRequest) {
  if (!s3 || !BUCKET) {
    return NextResponse.json({ error: 'S3 not configured' }, { status: 503 });
  }

  try {
    const { lessonId, dataUrl } = (await req.json()) as {
      lessonId?: string;
      dataUrl?: string;
    };

    if (!lessonId || !dataUrl?.startsWith('data:')) {
      return NextResponse.json(
        { error: 'lessonId and dataUrl (data: URL) are required' },
        { status: 400 },
      );
    }

    const commaIdx = dataUrl.indexOf(',');
    const header = dataUrl.slice(0, commaIdx);
    const base64Data = dataUrl.slice(commaIdx + 1);
    const mime = header.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
    const ext = MIME_TO_EXT[mime] ?? 'bin';

    const buffer = Buffer.from(base64Data, 'base64');
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const key = `lesson-${lessonId}/${hash}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mime,
      }),
    );

    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[media] upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
