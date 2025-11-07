package dto

type OidcUserInfo struct {
	Subject           string   `json:"sub"`
	Name              string   `json:"name,omitempty"`
	Email             string   `json:"email,omitempty"`
	EmailVerified     bool     `json:"email_verified,omitempty"`
	PreferredUsername string   `json:"preferred_username,omitempty"`
	GivenName         string   `json:"given_name,omitempty"`
	FamilyName        string   `json:"family_name,omitempty"`
	Admin             bool     `json:"admin,omitempty"`
	Roles             []string `json:"roles,omitempty"`
	Groups            []string `json:"groups,omitempty"`

	// Raw extra claims from userinfo (not serialized back out)
	Extra map[string]any `json:"-"`
}

type OidcDiscoveryDocument struct {
	Issuer                        string   `json:"issuer"`
	AuthorizationEndpoint         string   `json:"authorization_endpoint"`
	TokenEndpoint                 string   `json:"token_endpoint"`
	UserinfoEndpoint              string   `json:"userinfo_endpoint"`
	JwksURI                       string   `json:"jwks_uri"`
	ScopesSupported               []string `json:"scopes_supported"`
	ResponseTypesSupported        []string `json:"response_types_supported"`
	CodeChallengeMethodsSupported []string `json:"code_challenge_methods_supported"`
}

type OidcTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
}

type OidcStatusInfo struct {
	EnvForced     bool `json:"envForced"`
	EnvConfigured bool `json:"envConfigured"`
	MergeAccounts bool `json:"mergeAccounts"`
}

type OidcAuthUrlRequest struct {
	RedirectUri string `json:"redirectUri"`
}
