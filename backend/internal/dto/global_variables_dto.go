package dto

type GlobalVariableDto struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type GetGlobalVariablesResponse struct {
	Variables []GlobalVariableDto `json:"variables"`
}

type UpdateGlobalVariablesRequest struct {
	Variables []GlobalVariableDto `json:"variables"`
}
