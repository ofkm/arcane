package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

type OidcHandler struct {
	authService *services.AuthService
	oidcService *services.OidcService
}

func NewOidcHandler(authService *services.AuthService, oidcService *services.OidcService) *OidcHandler {
	return &OidcHandler{
		authService: authService,
		oidcService: oidcService,
	}
}

type OidcAuthUrlRequest struct {
	RedirectUri string `json:"redirectUri"`
}

type OidcAuthUrlResponse struct {
	AuthUrl string `json:"authUrl"`
	State   string `json:"state"`
}

type OidcCallbackRequest struct {
	Code  string `json:"code" binding:"required"`
	State string `json:"state" binding:"required"`
}

type OidcStatusResponse struct {
	Enabled            bool `json:"enabled"`
	Configured         bool `json:"configured"`
	EnvConfigured      bool `json:"envConfigured"`
	SettingsConfigured bool `json:"settingsConfigured"`
}

// GetOidcStatus returns the OIDC configuration status
func (h *OidcHandler) GetOidcStatus(c *gin.Context) {
	// Check if OIDC is enabled
	enabled, err := h.authService.IsOidcEnabled(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check OIDC status",
		})
		return
	}

	// Check if OIDC is configured
	configured := false
	envConfigured := false
	settingsConfigured := false

	if enabled {
		config, err := h.authService.GetOidcConfig(c.Request.Context())
		if err == nil && config != nil {
			configured = true
			settingsConfigured = true

			// Check if all required fields are present
			if config.ClientID != "" && config.ClientSecret != "" &&
				config.RedirectURI != "" && config.AuthorizationEndpoint != "" &&
				config.TokenEndpoint != "" && config.UserinfoEndpoint != "" {
				envConfigured = true
			}
		}
	}

	c.JSON(http.StatusOK, OidcStatusResponse{
		Enabled:            enabled,
		Configured:         configured,
		EnvConfigured:      envConfigured,
		SettingsConfigured: settingsConfigured,
	})
}

// GetOidcAuthUrl generates an OIDC authorization URL
func (h *OidcHandler) GetOidcAuthUrl(c *gin.Context) {
	var req OidcAuthUrlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// Check if OIDC is enabled
	enabled, err := h.authService.IsOidcEnabled(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check OIDC status",
		})
		return
	}

	if !enabled {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "OIDC authentication is disabled",
		})
		return
	}

	// Generate auth URL
	authUrl, state, err := h.oidcService.GenerateAuthURL(c.Request.Context(), req.RedirectUri)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to generate OIDC auth URL",
		})
		return
	}

	// Store state in session/cookie for verification
	c.SetCookie(
		"oidc_state",
		state,
		600, // 10 minutes
		"/",
		"",
		c.Request.TLS != nil, // secure if HTTPS
		true,                 // httpOnly
	)

	c.JSON(http.StatusOK, OidcAuthUrlResponse{
		AuthUrl: authUrl,
		State:   state,
	})
}

// HandleOidcCallback processes the OIDC callback
func (h *OidcHandler) HandleOidcCallback(c *gin.Context) {
	var req OidcCallbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// Get stored state from cookie
	storedState, err := c.Cookie("oidc_state")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Missing or invalid state",
		})
		return
	}

	// Clear the state cookie
	c.SetCookie(
		"oidc_state",
		"",
		-1, // Delete cookie
		"/",
		"",
		c.Request.TLS != nil,
		true,
	)

	// Handle the callback
	userInfo, err := h.oidcService.HandleCallback(c.Request.Context(), req.Code, req.State, storedState)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "OIDC callback failed: " + err.Error(),
		})
		return
	}

	// Authenticate or create user
	user, tokenPair, err := h.authService.OidcLogin(c.Request.Context(), *userInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to authenticate user: " + err.Error(),
		})
		return
	}

	// Set token cookie
	c.SetCookie(
		"token",
		tokenPair.AccessToken,
		int(tokenPair.ExpiresAt.Unix()),
		"/",
		"",
		c.Request.TLS != nil, // secure if HTTPS
		true,                 // httpOnly
	)

	// Return successful response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"id":          user.ID,
			"username":    user.Username,
			"displayName": user.DisplayName,
			"email":       user.Email,
			"roles":       user.Roles,
		},
		"token":        tokenPair.AccessToken,
		"refreshToken": tokenPair.RefreshToken,
		"expiresAt":    tokenPair.ExpiresAt,
	})
}

// GetOidcConfig returns the OIDC configuration (without sensitive data)
func (h *OidcHandler) GetOidcConfig(c *gin.Context) {
	config, err := h.authService.GetOidcConfig(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get OIDC configuration",
		})
		return
	}

	// Return config without sensitive information
	c.JSON(http.StatusOK, gin.H{
		"clientId":              config.ClientID,
		"redirectUri":           config.RedirectURI,
		"authorizationEndpoint": config.AuthorizationEndpoint,
		"tokenEndpoint":         config.TokenEndpoint,
		"userinfoEndpoint":      config.UserinfoEndpoint,
		"scopes":                config.Scopes,
		// Don't return ClientSecret for security
	})
}
