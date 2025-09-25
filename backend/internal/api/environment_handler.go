package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

const LOCAL_DOCKER_ENVIRONMENT_ID = "0"

type EnvironmentHandler struct {
	environmentService *services.EnvironmentService
	settingsService    *services.SettingsService
	cfg                *config.Config
}

func NewEnvironmentHandler(
	group *gin.RouterGroup,
	environmentService *services.EnvironmentService,
	settingsService *services.SettingsService,
	authMiddleware *middleware.AuthMiddleware,
	cfg *config.Config,
) {
	h := &EnvironmentHandler{
		environmentService: environmentService,
		settingsService:    settingsService,
		cfg:                cfg,
	}

	apiGroup := group.Group("/environments")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("", h.ListEnvironments)
		apiGroup.POST("", h.CreateEnvironment)
		apiGroup.GET("/:id", h.GetEnvironment)
		apiGroup.PUT("/:id", h.UpdateEnvironment)
		apiGroup.DELETE("/:id", h.DeleteEnvironment)
		apiGroup.POST("/:id/test", h.TestConnection)
		apiGroup.POST("/:id/heartbeat", h.UpdateHeartbeat)
		apiGroup.POST("/:id/agent/pair", h.PairAgent)
	}
}

func (h *EnvironmentHandler) PairAgent(c *gin.Context) {
	if c.Param("id") != LOCAL_DOCKER_ENVIRONMENT_ID {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Not found"}})
		return
	}
	type pairReq struct {
		Rotate *bool `json:"rotate,omitempty"`
	}
	var req pairReq
	_ = c.ShouldBindJSON(&req)

	if h.cfg.AgentToken == "" || (req.Rotate != nil && *req.Rotate) {
		h.cfg.AgentToken = utils.GenerateRandomString(48)
	}

	// Persist token on the agent so it survives restarts
	if err := h.settingsService.SetStringSetting(c.Request.Context(), "agentToken", h.cfg.AgentToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to persist agent token"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token": h.cfg.AgentToken,
		},
	})
}

// func (h *EnvironmentHandler) routeRequest(c *gin.Context, endpoint string) {
// 	environmentID := c.Param("id")

// 	if environmentID == LOCAL_DOCKER_ENVIRONMENT_ID {
// 		h.handleLocalRequest(c, endpoint)
// 		return
// 	}

// 	h.handleRemoteRequest(c, environmentID, endpoint)
// }

// func (h *EnvironmentHandler) handleLocalRequest(c *gin.Context, endpoint string) {
// 	if h.handleSystemRoutes(c, endpoint) {
// 		return
// 	}

// 	c.JSON(http.StatusNotFound, gin.H{
// 		"success": false,
// 		"data":    gin.H{"error": "Endpoint not found"},
// 	})
// }

// func (h *EnvironmentHandler) handleRemoteRequest(c *gin.Context, environmentID string, endpoint string) {
// 	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
// 	if err != nil || environment == nil {
// 		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found"}})
// 		return
// 	}
// 	if !environment.Enabled {
// 		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Environment is disabled"}})
// 		return
// 	}

// 	target := strings.TrimRight(environment.ApiUrl, "/") +
// 		"/api/environments/" + LOCAL_DOCKER_ENVIRONMENT_ID + endpoint
// 	if qs := c.Request.URL.RawQuery; qs != "" {
// 		target += "?" + qs
// 	}

// 	var reqBody io.Reader
// 	if c.Request.Body != nil {
// 		buf, _ := io.ReadAll(c.Request.Body)
// 		// reset original body in case other middlewares need it later
// 		c.Request.Body = io.NopCloser(bytes.NewBuffer(buf))
// 		reqBody = bytes.NewReader(buf)
// 	}

// 	req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, target, reqBody)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to create proxy request"}})
// 		return
// 	}

// 	// Copy headers except hop-by-hop and Authorization (we’ll set explicitly)
// 	skip := map[string]struct{}{
// 		"Host":                           {},
// 		"Connection":                     {},
// 		"Keep-Alive":                     {},
// 		"Proxy-Authenticate":             {},
// 		"Proxy-Authorization":            {},
// 		"Te":                             {},
// 		"Trailer":                        {},
// 		"Transfer-Encoding":              {},
// 		"Upgrade":                        {},
// 		"Content-Length":                 {},
// 		"Origin":                         {},
// 		"Referer":                        {},
// 		"Access-Control-Request-Method":  {},
// 		"Access-Control-Request-Headers": {},
// 		"Cookie":                         {},
// 	}
// 	for k, vs := range c.Request.Header {
// 		ck := http.CanonicalHeaderKey(k)
// 		if _, ok := skip[ck]; ok || ck == "Authorization" {
// 			continue
// 		}
// 		for _, v := range vs {
// 			req.Header.Add(k, v)
// 		}
// 	}

// 	// Forward Authorization (or promote cookie)
// 	if auth := c.GetHeader("Authorization"); auth != "" {
// 		req.Header.Set("Authorization", auth)
// 	} else if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
// 		req.Header.Set("Authorization", "Bearer "+cookieToken)
// 	}

// 	// Forward agent token if stored
// 	if environment.AccessToken != nil && *environment.AccessToken != "" {
// 		req.Header.Set("X-Arcane-Agent-Token", *environment.AccessToken)
// 	}

// 	req.Header.Set("X-Forwarded-For", c.ClientIP())
// 	req.Header.Set("X-Forwarded-Host", c.Request.Host)

// 	client := &http.Client{Timeout: 60 * time.Second}
// 	resp, err := client.Do(req)
// 	if err != nil {
// 		c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": fmt.Sprintf("Proxy request failed: %v", err)}})
// 		return
// 	}
// 	defer resp.Body.Close()

// 	// Skip hop-by-hop headers and any named in the Connection header (RFC 7230)
// 	hop := map[string]struct{}{
// 		http.CanonicalHeaderKey("Connection"):          {},
// 		http.CanonicalHeaderKey("Keep-Alive"):          {},
// 		http.CanonicalHeaderKey("Proxy-Authenticate"):  {},
// 		http.CanonicalHeaderKey("Proxy-Authorization"): {},
// 		http.CanonicalHeaderKey("TE"):                  {},
// 		http.CanonicalHeaderKey("Trailers"):            {},
// 		http.CanonicalHeaderKey("Trailer"):             {},
// 		http.CanonicalHeaderKey("Transfer-Encoding"):   {},
// 		http.CanonicalHeaderKey("Upgrade"):             {},
// 	}

// 	for _, connVal := range resp.Header.Values("Connection") {
// 		for _, token := range strings.Split(connVal, ",") {
// 			if t := strings.TrimSpace(token); t != "" {
// 				hop[http.CanonicalHeaderKey(t)] = struct{}{}
// 			}
// 		}
// 	}

// 	// Copy response headers except hop-by-hop
// 	for k, vs := range resp.Header {
// 		ck := http.CanonicalHeaderKey(k)
// 		if _, ok := hop[ck]; ok {
// 			continue
// 		}
// 		for _, v := range vs {
// 			c.Writer.Header().Add(k, v)
// 		}
// 	}

// 	c.Status(resp.StatusCode)

// 	if c.Request.Method != http.MethodHead {
// 		_, _ = io.Copy(c.Writer, resp.Body)
// 	}
// }

// Create
func (h *EnvironmentHandler) CreateEnvironment(c *gin.Context) {
	var req dto.CreateEnvironmentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid request format: " + err.Error()}})
		return
	}

	env := &models.Environment{
		ApiUrl:  req.ApiUrl,
		Enabled: true,
	}
	if req.Name != nil {
		env.Name = *req.Name
	}
	if req.Enabled != nil {
		env.Enabled = *req.Enabled
	}

	// Auto-pair with agent if bootstrap token is provided
	if (req.AccessToken == nil || *req.AccessToken == "") && req.BootstrapToken != nil && *req.BootstrapToken != "" {
		if token, err := h.environmentService.PairAgentWithBootstrap(c.Request.Context(), req.ApiUrl, *req.BootstrapToken); err == nil && token != "" {
			env.AccessToken = &token
		} else if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": "Agent pairing failed: " + err.Error()}})
			return
		}
	} else if req.AccessToken != nil && *req.AccessToken != "" {
		env.AccessToken = req.AccessToken
	}

	created, err := h.environmentService.CreateEnvironment(c.Request.Context(), env)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to create environment: " + err.Error()}})
		return
	}

	out, mapErr := dto.MapOne[*models.Environment, dto.EnvironmentDto](created)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to map environment"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": out})
}

func (h *EnvironmentHandler) ListEnvironments(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid pagination or sort parameters: " + err.Error()}})
		return
	}
	if req.Pagination.Page == 0 {
		req.Pagination.Page = 1
	}
	if req.Pagination.Limit == 0 {
		req.Pagination.Limit = 20
	}

	envs, pagination, err := h.environmentService.ListEnvironmentsPaginated(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to fetch environments"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       envs,
		"pagination": pagination,
	})
}

// Get by ID
func (h *EnvironmentHandler) GetEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found"}})
		return
	}

	out, mapErr := dto.MapOne[*models.Environment, dto.EnvironmentDto](environment)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to map environment"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

// Update
func (h *EnvironmentHandler) UpdateEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	var req dto.UpdateEnvironmentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid request body"}})
		return
	}

	updates := map[string]interface{}{}
	if req.ApiUrl != nil {
		updates["api_url"] = *req.ApiUrl
	}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}

	// If caller asked to pair (bootstrapToken present) and no accessToken provided in the request,
	// resolve apiUrl (current or updated) and let the service pair and persist the token.
	if (req.AccessToken == nil) && req.BootstrapToken != nil && *req.BootstrapToken != "" {
		current, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
		if err != nil || current == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found"}})
			return
		}
		apiUrl := current.ApiUrl
		if req.ApiUrl != nil && *req.ApiUrl != "" {
			apiUrl = *req.ApiUrl
		}
		if _, err := h.environmentService.PairAndPersistAgentToken(c.Request.Context(), environmentID, apiUrl, *req.BootstrapToken); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": "Agent pairing failed: " + err.Error()}})
			return
		}
	} else if req.AccessToken != nil {
		updates["access_token"] = *req.AccessToken
	}

	updated, err := h.environmentService.UpdateEnvironment(c.Request.Context(), environmentID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to update environment"}})
		return
	}

	out, mapErr := dto.MapOne[*models.Environment, dto.EnvironmentDto](updated)
	if mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to map environment"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}

// Delete
func (h *EnvironmentHandler) DeleteEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	err := h.environmentService.DeleteEnvironment(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to delete environment: " + err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Environment deleted successfully"},
	})
}

// TestConnection
func (h *EnvironmentHandler) TestConnection(c *gin.Context) {
	environmentID := c.Param("id")

	status, err := h.environmentService.TestConnection(c.Request.Context(), environmentID)
	resp := dto.TestConnectionDto{Status: status}
	if err != nil {
		msg := err.Error()
		resp.Message = &msg
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"data":    resp,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}

func (h *EnvironmentHandler) UpdateHeartbeat(c *gin.Context) {
	environmentID := c.Param("id")

	err := h.environmentService.UpdateEnvironmentHeartbeat(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update heartbeat",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Heartbeat updated successfully",
	})
}

// func (h *EnvironmentHandler) getContainerLogsWS(c *gin.Context) {
// 	envID := c.Param("id")
// 	containerID := c.Param("containerId")

// 	if envID == LOCAL_DOCKER_ENVIRONMENT_ID {
// 		h.routeRequest(c, "/containers/"+containerID+"/logs/ws")
// 		return
// 	}

// 	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), envID)
// 	if err != nil || environment == nil || !environment.Enabled {
// 		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found or disabled"}})
// 		return
// 	}

// 	u, err := url.Parse(strings.TrimRight(environment.ApiUrl, "/"))
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid environment URL"}})
// 		return
// 	}
// 	if u.Scheme == "https" {
// 		u.Scheme = "wss"
// 	} else {
// 		u.Scheme = "ws"
// 	}
// 	u.Path = path.Join(u.Path, "/api/environments/"+LOCAL_DOCKER_ENVIRONMENT_ID+"/containers/"+containerID+"/logs/ws")
// 	u.RawQuery = c.Request.URL.RawQuery

// 	hdr := http.Header{}
// 	if auth := c.GetHeader("Authorization"); auth != "" {
// 		hdr.Set("Authorization", auth)
// 	} else if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
// 		hdr.Set("Authorization", "Bearer "+cookieToken)
// 	}
// 	if environment.AccessToken != nil && *environment.AccessToken != "" {
// 		hdr.Set("X-Arcane-Agent-Token", *environment.AccessToken)
// 	}

// 	_ = wsutil.ProxyHTTP(c.Writer, c.Request, u.String(), hdr)
// }

// //nolint:gocognit
// func (h *EnvironmentHandler) GetStatsWS(c *gin.Context) {
// 	envID := c.Param("id")
// 	if envID == "" {
// 		envID = LOCAL_DOCKER_ENVIRONMENT_ID
// 	}

// 	if envID == LOCAL_DOCKER_ENVIRONMENT_ID {
// 		conn, err := sysWsUpgrader.Upgrade(c.Writer, c.Request, nil)
// 		if err != nil {
// 			return
// 		}
// 		defer conn.Close()

// 		ticker := time.NewTicker(2 * time.Second)
// 		defer ticker.Stop()

// 		var lastCPU float64

// 		send := func(block bool) error {
// 			var cpuUsage float64
// 			if block {
// 				if vals, err := cpu.Percent(time.Second, false); err == nil && len(vals) > 0 {
// 					cpuUsage = vals[0]
// 					lastCPU = cpuUsage
// 				} else {
// 					cpuUsage = lastCPU
// 				}
// 			} else {
// 				cpuUsage = lastCPU
// 			}

// 			cpuCount, err := cpu.Counts(true)
// 			if err != nil {
// 				cpuCount = runtime.NumCPU()
// 			}

// 			memInfo, _ := mem.VirtualMemory()
// 			var memUsed, memTotal uint64
// 			if memInfo != nil {
// 				memUsed = memInfo.Used
// 				memTotal = memInfo.Total
// 			}

// 			diskInfo, _ := disk.Usage("/")
// 			var diskUsed, diskTotal uint64
// 			if diskInfo != nil {
// 				diskUsed = diskInfo.Used
// 				diskTotal = diskInfo.Total
// 			}

// 			hostInfo, _ := host.Info()
// 			var hostname string
// 			if hostInfo != nil {
// 				hostname = hostInfo.Hostname
// 			}

// 			stats := SystemStats{
// 				CPUUsage:     cpuUsage,
// 				MemoryUsage:  memUsed,
// 				MemoryTotal:  memTotal,
// 				DiskUsage:    diskUsed,
// 				DiskTotal:    diskTotal,
// 				CPUCount:     cpuCount,
// 				Architecture: runtime.GOARCH,
// 				Platform:     runtime.GOOS,
// 				Hostname:     hostname,
// 			}

// 			_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
// 			return conn.WriteJSON(stats)
// 		}

// 		if err := send(true); err != nil {
// 			return
// 		}

// 		for {
// 			select {
// 			case <-c.Request.Context().Done():
// 				return
// 			case <-ticker.C:
// 				if err := send(true); err != nil {
// 					return
// 				}
// 			}
// 		}
// 	}

// 	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), envID)
// 	if err != nil || environment == nil || !environment.Enabled {
// 		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found or disabled"}})
// 		return
// 	}

// 	target, hdr, err := h.environmentService.BuildRemoteWSTarget(environment, "/api/environments/0/stats/ws", c.Request)
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": err.Error()}})
// 		return
// 	}
// 	_ = wsutil.ProxyHTTP(c.Writer, c.Request, target, hdr)
// }

// func (h *EnvironmentHandler) getProjectLogsWS(c *gin.Context) {
// 	envID := c.Param("id")
// 	projectId := c.Param("projectId")

// 	if envID == LOCAL_DOCKER_ENVIRONMENT_ID {
// 		h.routeRequest(c, "/projects/"+projectId+"/logs/ws")
// 		return
// 	}

// 	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), envID)
// 	if err != nil || environment == nil || !environment.Enabled {
// 		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found or disabled"}})
// 		return
// 	}

// 	u, err := url.Parse(strings.TrimRight(environment.ApiUrl, "/"))
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid environment URL"}})
// 		return
// 	}
// 	if u.Scheme == "https" {
// 		u.Scheme = "wss"
// 	} else {
// 		u.Scheme = "ws"
// 	}
// 	u.Path = path.Join(u.Path, "/api/environments/"+LOCAL_DOCKER_ENVIRONMENT_ID+"/projects/"+projectId+"/logs/ws")
// 	u.RawQuery = c.Request.URL.RawQuery

// 	hdr := http.Header{}
// 	// Forward auth if present
// 	if auth := c.GetHeader("Authorization"); auth != "" {
// 		hdr.Set("Authorization", auth)
// 	} else if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
// 		hdr.Set("Authorization", "Bearer "+cookieToken)
// 	}
// 	// Agent token
// 	if environment.AccessToken != nil && *environment.AccessToken != "" {
// 		hdr.Set("X-Arcane-Agent-Token", *environment.AccessToken)
// 	}

// 	_ = wsutil.ProxyHTTP(c.Writer, c.Request, u.String(), hdr)
// }
