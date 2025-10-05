export interface APISuccessResponse<T = any> {
	success: true;
	data: T;
	message?: string;
}

export interface APIErrorResponse {
	success: false;
	error: string;
	code?: string;
	details?: any;
}

export type APIResponse<T = any> = APISuccessResponse<T> | APIErrorResponse;

export interface MessageResponse {
	message: string;
}

export function isSuccessResponse<T>(response: APIResponse<T>): response is APISuccessResponse<T> {
	return response.success === true;
}

export function isErrorResponse(response: APIResponse): response is APIErrorResponse {
	return response.success === false;
}
