export function shortId(id: string): string {
	return id?.substring(0, 12) || '';
}

export const capitalizeFirstLetter = (text: string) => {
	if (!text) return '';
	return text.charAt(0).toUpperCase() + text.slice(1);
};
