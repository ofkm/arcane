package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/services"
)

type OidcHandler struct {
	authService *services.AuthService
	oidcService *services.OidcService
	appConfig   *config.Config // Add app config
}

func NewOidcHandler(authService *services.AuthService, oidcService *services.OidcService, appConfig *config.Config) *OidcHandler { // Add appConfig
	return &OidcHandler{
		authService: authService,
		oidcService: oidcService,
		appConfig:   appConfig, // Store appConfig
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

// GetOidcStatus returns the OIDC configuration status
func (h *OidcHandler) GetOidcStatus(c *gin.Context) {
	status, err := h.authService.GetOidcConfigurationStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve OIDC status: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, status) // Return the OidcStatusInfo directly
}

// GetOidcAuthUrl generates an OIDC authorization URL
func (h *OidcHandler) GetOidcAuthUrl(c *gin.Context) {
	var req OidcAuthUrlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid request format"})
		return
	}

	// authService.IsOidcEnabled() will use getAuthSettings which respects env vars
	enabled, err := h.authService.IsOidcEnabled(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to check OIDC status"})
		return
	}
	if !enabled {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "OIDC authentication is disabled"})
		return
	}

	// oidcService.GenerateAuthURL internally calls authService.GetOidcConfig,
	// which also respects env vars via getAuthSettings.
	authUrl, stateCookieValue, err := h.oidcService.GenerateAuthURL(c.Request.Context(), req.RedirectUri)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to generate OIDC auth URL: " + err.Error()})
		return
	}

	c.SetCookie(
		"oidc_state",
		stateCookieValue, // This is the base64 encoded OidcState struct
		600,              // 10 minutes
		"/",
		"",                   // Domain
		c.Request.TLS != nil, // Secure if HTTPS
		true,                 // HttpOnly
	)

	c.JSON(http.StatusOK, gin.H{
		"authUrl": authUrl,
		// No longer returning state in JSON response as it's complex and handled by cookie
	})
}

// HandleOidcCallback processes the OIDC callback
func (h *OidcHandler) HandleOidcCallback(c *gin.Context) {
	var req struct {
		Code  string `json:"code" binding:"required"`
		State string `json:"state" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Get stored state from cookie (this is the base64 encoded OidcState)
	encodedStateFromCookie, err := c.Cookie("oidc_state")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Missing or invalid OIDC state cookie"})
		return
	}

	// Clear the state cookie
	c.SetCookie("oidc_state", "", -1, "/", "", c.Request.TLS != nil, true)

	// Call the OIDC service to handle the callback
	userInfo, err := h.oidcService.HandleCallback(c.Request.Context(), req.Code, req.State, encodedStateFromCookie)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Authenticate or create user via auth service
	user, tokenPair, err := h.authService.OidcLogin(c.Request.Context(), *userInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Authentication failed"})
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
