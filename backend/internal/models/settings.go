package models

type AuthSettings struct {
	LocalAuthEnabled bool        `json:"localAuthEnabled"`
	OidcEnabled      bool        `json:"oidcEnabled"`
	SessionTimeout   int         `json:"sessionTimeout"`
	PasswordPolicy   string      `json:"passwordPolicy"`
	RbacEnabled      bool        `json:"rbacEnabled"`
	Oidc             *OidcConfig `json:"oidc,omitempty"`
}

type OidcConfig struct {
	ClientID              string `json:"clientId"`
	ClientSecret          string `json:"clientSecret"`
	RedirectURI           string `json:"redirectUri"`
	AuthorizationEndpoint string `json:"authorizationEndpoint"`
	TokenEndpoint         string `json:"tokenEndpoint"`
	UserinfoEndpoint      string `json:"userinfoEndpoint"`
	Scopes                string `json:"scopes"`
}

type RegistryCredential struct {
	URL      string `json:"url"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type TemplateRegistryConfig struct {
	URL         string `json:"url"`
	Name        string `json:"name"`
	Enabled     bool   `json:"enabled"`
	LastUpdated *int64 `json:"lastUpdated,omitempty"`
	CacheTTL    *int   `json:"cacheTtl,omitempty"`
}

type Onboarding struct {
	Completed   bool   `json:"completed"`
	CompletedAt *int64 `json:"completedAt,omitempty"`
	Steps       *struct {
		Welcome  *bool `json:"welcome,omitempty"`
		Password *bool `json:"password,omitempty"`
		Settings *bool `json:"settings,omitempty"`
	} `json:"steps,omitempty"`
}

type Settings struct {
	ID                  uint    `json:"id" gorm:"primaryKey;autoIncrement"`
	DockerTLSCert       string  `json:"dockerTLSCert" gorm:"column:docker_tls_cert"`
	StacksDirectory     string  `json:"stacksDirectory" gorm:"column:stacks_directory;not null"`
	AutoUpdate          bool    `json:"autoUpdate" gorm:"column:auto_update;default:false"`
	AutoUpdateInterval  int     `json:"autoUpdateInterval" gorm:"column:auto_update_interval;default:300"`
	PollingEnabled      bool    `json:"pollingEnabled" gorm:"column:polling_enabled;default:true"`
	PollingInterval     int     `json:"pollingInterval" gorm:"column:polling_interval;default:5"`
	PruneMode           *string `json:"pruneMode,omitempty" gorm:"column:prune_mode"`
	RegistryCredentials JSON    `json:"registryCredentials" gorm:"type:text;column:registry_credentials;default:'[]'"`
	TemplateRegistries  JSON    `json:"templateRegistries" gorm:"type:text;column:template_registries;default:'[]'"`
	Auth                JSON    `json:"auth" gorm:"type:text;not null"`
	Onboarding          JSON    `json:"onboarding,omitempty" gorm:"type:text"`
	BaseServerURL       *string `json:"baseServerUrl,omitempty" gorm:"column:base_server_url"`
	BaseModel
}

func (Settings) TableName() string {
	return "settings_table"
}
