const units: { [key: string]: number } = {
	b: 1,
	k: 1024,
	m: 1024 * 1024,
	g: 1024 * 1024 * 1024
};

export function parseBytes(input: string): number {
	const valueStr = input.toLowerCase().trim();
	const unit = valueStr.charAt(valueStr.length - 1);
	const value = parseFloat(valueStr.substring(0, valueStr.length - 1));

	if (isNaN(value)) {
		throw new Error(`Invalid numeric value in memory string: ${input}`);
	}

	if (units[unit]) {
		return Math.floor(value * units[unit]);
	} else if (!isNaN(parseFloat(valueStr))) {
		// Assume bytes if no unit
		return Math.floor(parseFloat(valueStr));
	} else {
		throw new Error(`Invalid memory unit: ${unit}. Use b, k, m, or g.`);
	}
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (!+bytes) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
