import { S3Client } from '@aws-sdk/client-s3';

function createClient() {
  if (!process.env.MICA_MEDIA_BUCKET) return null;
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-west-2';
  return new S3Client({ region });
}

const s3 = createClient();
export default s3;
