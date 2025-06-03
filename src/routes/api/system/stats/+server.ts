import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';
import { promises as fs } from 'fs';
import { platform } from 'os';

interface SystemStats {
	cpuUsage: number;
	memoryUsage: number;
	memoryTotal: number;
}

async function getLinuxCpuUsage(): Promise<number> {
	try {
		const stat1 = await fs.readFile('/proc/stat', 'utf8');
		const line1 = stat1.split('\n')[0];
		const times1 = line1.split(/\s+/).slice(1, 8).map(Number);
		const idle1 = times1[3] + times1[4];
		const total1 = times1.reduce((a, b) => a + b, 0);

		// Wait 1 second for accurate measurement
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const stat2 = await fs.readFile('/proc/stat', 'utf8');
		const line2 = stat2.split('\n')[0];
		const times2 = line2.split(/\s+/).slice(1, 8).map(Number);
		const idle2 = times2[3] + times2[4];
		const total2 = times2.reduce((a, b) => a + b, 0);

		const idleDiff = idle2 - idle1;
		const totalDiff = total2 - total1;

		const cpuUsage = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0;
		return Math.max(0, Math.min(100, cpuUsage));
	} catch (error) {
		console.error('Error reading CPU stats from /proc/stat:', error);
		return 0;
	}
}

async function getLinuxMemoryStats(): Promise<{ usage: number; total: number }> {
	try {
		const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
		const lines = meminfo.split('\n');

		const getValue = (key: string): number => {
			const line = lines.find((l) => l.startsWith(key));
			if (!line) return 0;
			const match = line.match(/(\d+)/);
			return match ? parseInt(match[1]) * 1024 : 0; // Convert KB to bytes
		};

		const memTotal = getValue('MemTotal:');
		const memFree = getValue('MemFree:');
		const buffers = getValue('Buffers:');
		const cached = getValue('Cached:');
		const sReclaimable = getValue('SReclaimable:');

		// Calculate actual memory usage (excluding buffers and cache)
		const memUsed = memTotal - memFree - buffers - cached - sReclaimable;

		return {
			usage: Math.max(0, memUsed),
			total: memTotal
		};
	} catch (error) {
		console.error('Error reading memory stats from /proc/meminfo:', error);
		return { usage: 0, total: 0 };
	}
}

async function getMacOSStats(): Promise<SystemStats> {
	try {
		const { exec } = await import('child_process');
		const { promisify } = await import('util');
		const execAsync = promisify(exec);

		// Get CPU usage
		const { stdout: cpuOutput } = await execAsync('top -l 1 -n 0 | grep "CPU usage"');
		const cpuMatch = cpuOutput.match(/(\d+\.\d+)% user/);
		const cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;

		// Get memory stats
		const { stdout: memOutput } = await execAsync('vm_stat');
		const pageSize = 4096; // macOS page size is typically 4KB

		const getMemValue = (key: string): number => {
			const match = memOutput.match(new RegExp(`${key}:\\s+(\\d+)`));
			return match ? parseInt(match[1]) * pageSize : 0;
		};

		const pagesWired = getMemValue('Pages wired down');
		const pagesActive = getMemValue('Pages active');
		const pagesInactive = getMemValue('Pages inactive');
		const pagesSpeculative = getMemValue('Pages speculative');
		const pagesCompressed = getMemValue('Pages stored in compressor');

		// Get total memory
		const { stdout: hwOutput } = await execAsync('sysctl hw.memsize');
		const memTotalMatch = hwOutput.match(/hw\.memsize: (\d+)/);
		const memTotal = memTotalMatch ? parseInt(memTotalMatch[1]) : 0;

		const memUsed = pagesWired + pagesActive + pagesInactive + pagesSpeculative + pagesCompressed;

		return {
			cpuUsage: Math.max(0, Math.min(100, cpuUsage)),
			memoryUsage: memUsed,
			memoryTotal: memTotal
		};
	} catch (error) {
		console.error('Error getting macOS system stats:', error);
		return { cpuUsage: 0, memoryUsage: 0, memoryTotal: 0 };
	}
}

async function getSystemStats(): Promise<SystemStats> {
	const os = platform();

	if (os === 'linux') {
		const [cpuUsage, memStats] = await Promise.all([getLinuxCpuUsage(), getLinuxMemoryStats()]);

		return {
			cpuUsage,
			memoryUsage: memStats.usage,
			memoryTotal: memStats.total
		};
	} else if (os === 'darwin') {
		return getMacOSStats();
	} else {
		// Fallback for other operating systems
		console.warn(`System stats not supported for platform: ${os}`);
		return {
			cpuUsage: 0,
			memoryUsage: 0,
			memoryTotal: 0
		};
	}
}

export const GET: RequestHandler = async () => {
	console.log('API: GET /api/system/stats - Fetching system statistics');

	const result = await tryCatch(getSystemStats());

	if (result.error) {
		console.error('API Error (getSystemStats):', result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to get system statistics.',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	const stats = result.data;

	console.log(`API: System stats retrieved - CPU: ${stats.cpuUsage.toFixed(1)}%, Memory: ${((stats.memoryUsage / stats.memoryTotal) * 100).toFixed(1)}%`);

	return json({
		success: true,
		...stats
	});
};
