export function shortId(id: string): string {
	return id?.substring(0, 12) || '';
}
