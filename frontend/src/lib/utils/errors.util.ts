export function extractDockerErrorMessage(error: any): string {
	if (!error) return 'Unknown error';

	if (error.response && error.response.data) {
		if (typeof error.response.data === 'string') return error.response.data;
		if (error.response.data.error) return error.response.data.error;
	}

	if (error.body && error.body.error) return error.body.error;
	if (error.error) return error.error;
	if (error.reason) return error.reason;
	if (error.stderr) return error.stderr;
	if (error.data && typeof error.data === 'string') return error.data;
	if (error.message) return error.message;
	return JSON.stringify(error);
}
