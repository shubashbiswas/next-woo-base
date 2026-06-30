// Health check endpoint for uptime monitoring and load balancer health checks
// Returns system status, memory usage, and uptime information.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  const healthStatus = {
    status: "ok",
    timestamp: Date.now(),
    uptime: Math.floor(uptime),
    uptimeHuman: formatUptime(uptime),
    memory: {
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      rss: formatBytes(memoryUsage.rss),
      external: formatBytes(memoryUsage.external || 0),
    },
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
  };

  return Response.json(healthStatus, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}