import postgres from 'postgres';

// Singleton connection pool — reused across requests in the same process.
// Gracefully disabled when MICA_DATABASE_URL is not set (local dev without DB).
function createClient() {
  const url = process.env.MICA_DATABASE_URL;
  if (!url) return null;
  return postgres(url, { max: 5, idle_timeout: 30 });
}

const sql = createClient();
export default sql;
