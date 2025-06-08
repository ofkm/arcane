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
	appConfig   *config.Config
}

func NewOidcHandler(authService *services.AuthService, oidcService *services.OidcService, appConfig *config.Config) *OidcHandler {
	return &OidcHandler{
		authService: authService,
		oidcService: oidcService,
		appConfig:   appConfig,
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

func (h *OidcHandler) GetOidcStatus(c *gin.Context) {
	status, err := h.authService.GetOidcConfigurationStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve OIDC status: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, status)
}

func (h *OidcHandler) GetOidcAuthUrl(c *gin.Context) {
	var req OidcAuthUrlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid request format"})
		return
	}

	enabled, err := h.authService.IsOidcEnabled(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to check OIDC status"})
		return
	}
	if !enabled {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "OIDC authentication is disabled"})
		return
	}

	authUrl, stateCookieValue, err := h.oidcService.GenerateAuthURL(c.Request.Context(), req.RedirectUri)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to generate OIDC auth URL: " + err.Error()})
		return
	}

	c.SetCookie(
		"oidc_state",
		stateCookieValue,
		600,
		"/",
		"",
		c.Request.TLS != nil,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"authUrl": authUrl,
	})
}

func (h *OidcHandler) HandleOidcCallback(c *gin.Context) {
	var req struct {
		Code  string `json:"code" binding:"required"`
		State string `json:"state" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	encodedStateFromCookie, err := c.Cookie("oidc_state")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Missing or invalid OIDC state cookie"})
		return
	}

	c.SetCookie("oidc_state", "", -1, "/", "", c.Request.TLS != nil, true)

	userInfo, err := h.oidcService.HandleCallback(c.Request.Context(), req.Code, req.State, encodedStateFromCookie)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, tokenPair, err := h.authService.OidcLogin(c.Request.Context(), *userInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Authentication failed"})
		return
	}

	c.SetCookie(
		"token",
		tokenPair.AccessToken,
		int(tokenPair.ExpiresAt.Unix()),
		"/",
		"",
		c.Request.TLS != nil,
		true,
	)

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

func (h *OidcHandler) GetOidcConfig(c *gin.Context) {
	config, err := h.authService.GetOidcConfig(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get OIDC configuration",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clientId":              config.ClientID,
		"redirectUri":           config.RedirectURI,
		"authorizationEndpoint": config.AuthorizationEndpoint,
		"tokenEndpoint":         config.TokenEndpoint,
		"userinfoEndpoint":      config.UserinfoEndpoint,
		"scopes":                config.Scopes,
	})
}
