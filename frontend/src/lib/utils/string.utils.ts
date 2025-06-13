export function capitalizeFirstLetter(string: string): string {
	if (!string) return '';
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export function shortId(id: string | undefined, length = 12): string {
	if (!id) return 'N/A';
	return id.substring(0, length);
}

export function truncateString(str: string | undefined, maxLength: number): string {
	if (!str) return '';
	if (str.length <= maxLength) {
		return str;
	}
	return str.substring(0, maxLength - 3) + '...';
}

export function formatDate(dateString: string | undefined | null): string {
	if (!dateString) return 'Unknown';
	try {
		return new Date(dateString).toLocaleString();
	} catch (e) {
		return 'Invalid Date';
	}
}

// Function to format logs with some basic highlighting
export function formatLogLine(line: string): string {
	if (line.includes('ERROR') || line.includes('FATAL') || line.includes('WARN')) {
		return `<span class="text-red-400">${line}</span>`;
	}
	if (line.includes('INFO')) {
		return `<span class="text-blue-400">${line}</span>`;
	}
	return line;
}

export function parseStatusTime(status: string): number {
	// Extract time information from status strings like "Up 2 days" or "Exited (0) 12 hours ago"
	const timeRegex = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s*(ago)?/i;
	const match = status.match(timeRegex);

	if (!match) {
		// If no time found, treat as 0 (just started)
		return 0;
	}

	const value = parseInt(match[1]);
	const unit = match[2].toLowerCase();
	const isAgo = !!match[3]; // "ago" means it's been stopped for that time

	// Convert everything to hours for comparison
	let hours = 0;
	switch (unit) {
		case 'second':
			hours = value / 3600;
			break;
		case 'minute':
			hours = value / 60;
			break;
		case 'hour':
			hours = value;
			break;
		case 'day':
			hours = value * 24;
			break;
		case 'week':
			hours = value * 24 * 7;
			break;
		case 'month':
			hours = value * 24 * 30;
			break;
		case 'year':
			hours = value * 24 * 365;
			break;
	}

	// For "ago" times (stopped containers), make them negative so they sort after running ones
	return isAgo ? -hours : hours;
}
