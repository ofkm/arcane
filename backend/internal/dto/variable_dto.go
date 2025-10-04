package dto

type VariableDto struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type GetVariablesResponse struct {
	Variables []VariableDto `json:"variables"`
}

type UpdateVariablesRequest struct {
	Variables []VariableDto `json:"variables"`
}
