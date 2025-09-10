package cookie

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

var (
	TokenCookieName         = "__Host-token" // #nosec G101: cookie name label, not a credential
	InsecureTokenCookieName = "token"        // #nosec G101: cookie name label, not a credential
	OidcStateCookieName     = "oidc_state"
)

func isSecure(c *gin.Context) bool {
	return c.Request.TLS != nil
}

func tokenCookieName(c *gin.Context) string {
	if isSecure(c) {
		return TokenCookieName
	}
	return InsecureTokenCookieName
}

func CreateTokenCookie(c *gin.Context, maxAgeInSeconds int, token string) {
	if maxAgeInSeconds < 0 {
		maxAgeInSeconds = 0
	}
	name := tokenCookieName(c)
	c.SetCookie(name, token, maxAgeInSeconds, "/", "", isSecure(c), true)
}

func ClearTokenCookie(c *gin.Context) {
	name := tokenCookieName(c)
	c.SetCookie(name, "", -1, "/", "", isSecure(c), true)
}

func GetTokenCookie(c *gin.Context) (string, error) {
	// Try secure name first, then fallback to insecure
	if v, err := c.Cookie(TokenCookieName); err == nil {
		return v, nil
	}
	return c.Cookie(InsecureTokenCookieName)
}

func CreateOidcStateCookie(c *gin.Context, value string, maxAgeInSeconds int) {
	c.SetSameSite(http.SameSiteLaxMode)
	if maxAgeInSeconds < 0 {
		maxAgeInSeconds = 0
	}
	c.SetCookie(OidcStateCookieName, value, maxAgeInSeconds, "/", "", c.Request.TLS != nil, true)
}

func GetOidcStateCookie(c *gin.Context) (string, error) {
	return c.Cookie(OidcStateCookieName)
}

func ClearOidcStateCookie(c *gin.Context) {
	c.SetCookie(OidcStateCookieName, "", -1, "/", "", c.Request.TLS != nil, true)
}
