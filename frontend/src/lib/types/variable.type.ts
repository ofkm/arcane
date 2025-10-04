export interface Variable {
	key: string;
	value: string;
}

export interface GlobalVariablesResponse {
	variables: Variable[];
}

export interface UpdateGlobalVariablesRequest {
	variables: Variable[];
}
