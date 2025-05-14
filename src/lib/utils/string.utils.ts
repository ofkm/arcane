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
