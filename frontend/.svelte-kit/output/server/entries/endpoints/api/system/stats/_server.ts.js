import { j as json } from "../../../../../chunks/index.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
import { promises } from "fs";
import { platform } from "os";
async function getLinuxCpuUsage() {
  try {
    const stat1 = await promises.readFile("/proc/stat", "utf8");
    const line1 = stat1.split("\n")[0];
    const times1 = line1.split(/\s+/).slice(1, 8).map(Number);
    const idle1 = times1[3] + times1[4];
    const total1 = times1.reduce((a, b) => a + b, 0);
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const stat2 = await promises.readFile("/proc/stat", "utf8");
    const line2 = stat2.split("\n")[0];
    const times2 = line2.split(/\s+/).slice(1, 8).map(Number);
    const idle2 = times2[3] + times2[4];
    const total2 = times2.reduce((a, b) => a + b, 0);
    const idleDiff = idle2 - idle1;
    const totalDiff = total2 - total1;
    const cpuUsage = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0;
    return Math.max(0, Math.min(100, cpuUsage));
  } catch (error) {
    console.error("Error reading CPU stats from /proc/stat:", error);
    return 0;
  }
}
async function getLinuxMemoryStats() {
  try {
    const meminfo = await promises.readFile("/proc/meminfo", "utf8");
    const lines = meminfo.split("\n");
    const getValue = (key) => {
      const line = lines.find((l) => l.startsWith(key));
      if (!line) return 0;
      const match = line.match(/(\d+)/);
      return match ? parseInt(match[1]) * 1024 : 0;
    };
    const memTotal = getValue("MemTotal:");
    const memFree = getValue("MemFree:");
    const buffers = getValue("Buffers:");
    const cached = getValue("Cached:");
    const sReclaimable = getValue("SReclaimable:");
    const memUsed = memTotal - memFree - buffers - cached - sReclaimable;
    return {
      usage: Math.max(0, memUsed),
      total: memTotal
    };
  } catch (error) {
    console.error("Error reading memory stats from /proc/meminfo:", error);
    return { usage: 0, total: 0 };
  }
}
async function getLinuxDiskStats() {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync("df -k / | tail -1");
    const parts = stdout.trim().split(/\s+/);
    const total = parseInt(parts[1]) * 1024;
    const used = parseInt(parts[2]) * 1024;
    return {
      usage: used,
      total
    };
  } catch (error) {
    console.error("Error reading disk stats:", error);
    return { usage: 0, total: 0 };
  }
}
async function getMacOSStats() {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const { stdout: cpuOutput } = await execAsync('top -l 1 -n 0 | grep "CPU usage"');
    const cpuMatch = cpuOutput.match(/(\d+\.\d+)% user/);
    const cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
    const { stdout: memOutput } = await execAsync("vm_stat");
    const pageSize = 4096;
    const getMemValue = (key) => {
      const match = memOutput.match(new RegExp(`${key}:\\s+(\\d+)`));
      return match ? parseInt(match[1]) * pageSize : 0;
    };
    const pagesWired = getMemValue("Pages wired down");
    const pagesActive = getMemValue("Pages active");
    const pagesInactive = getMemValue("Pages inactive");
    const pagesSpeculative = getMemValue("Pages speculative");
    const pagesCompressed = getMemValue("Pages stored in compressor");
    const { stdout: hwOutput } = await execAsync("sysctl hw.memsize");
    const memTotalMatch = hwOutput.match(/hw\.memsize: (\d+)/);
    const memTotal = memTotalMatch ? parseInt(memTotalMatch[1]) : 0;
    const memUsed = pagesWired + pagesActive + pagesInactive + pagesSpeculative + pagesCompressed;
    const { stdout: diskOutput } = await execAsync("df -k / | tail -1");
    const diskParts = diskOutput.trim().split(/\s+/);
    const diskTotal = parseInt(diskParts[1]) * 1024;
    const diskUsed = parseInt(diskParts[2]) * 1024;
    return {
      cpuUsage: Math.max(0, Math.min(100, cpuUsage)),
      memoryUsage: memUsed,
      memoryTotal: memTotal,
      diskUsage: diskUsed,
      diskTotal
    };
  } catch (error) {
    console.error("Error getting macOS system stats:", error);
    return { cpuUsage: 0, memoryUsage: 0, memoryTotal: 0 };
  }
}
async function getSystemStats() {
  const os = platform();
  if (os === "linux") {
    const [cpuUsage, memStats, diskStats] = await Promise.all([getLinuxCpuUsage(), getLinuxMemoryStats(), getLinuxDiskStats()]);
    return {
      cpuUsage,
      memoryUsage: memStats.usage,
      memoryTotal: memStats.total,
      diskUsage: diskStats.usage,
      diskTotal: diskStats.total
    };
  } else if (os === "darwin") {
    return getMacOSStats();
  } else {
    console.warn(`System stats not supported for platform: ${os}`);
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryTotal: 0
    };
  }
}
const GET = async () => {
  console.log("API: GET /api/system/stats - Fetching system statistics");
  const result = await tryCatch(getSystemStats());
  if (result.error) {
    console.error("API Error (getSystemStats):", result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to get system statistics.",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  const stats = result.data;
  console.log(`API: System stats retrieved - CPU: ${stats.cpuUsage.toFixed(1)}%, Memory: ${(stats.memoryUsage / stats.memoryTotal * 100).toFixed(1)}%`);
  return json({
    success: true,
    ...stats
  });
};
export {
  GET
};
