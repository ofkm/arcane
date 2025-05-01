export type ApiResponse = {
	success?: boolean;
	message?: string;
	error?: string;
	[key: string]: unknown;
};
