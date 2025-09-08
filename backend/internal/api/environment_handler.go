package api

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

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
	containerService   *services.ContainerService
	imageService       *services.ImageService
	networkService     *services.NetworkService
	volumeService      *services.VolumeService
	stackService       *services.StackService
	settingsService    *services.SettingsService
	imageUpdateService *services.ImageUpdateService
	updaterService     *services.UpdaterService
	cfg                *config.Config
}

func NewEnvironmentHandler(
	group *gin.RouterGroup,
	environmentService *services.EnvironmentService,
	containerService *services.ContainerService,
	imageService *services.ImageService,
	imageUpdateService *services.ImageUpdateService,
	updaterService *services.UpdaterService,
	networkService *services.NetworkService,
	volumeService *services.VolumeService,
	stackService *services.StackService,
	settingsService *services.SettingsService,
	authMiddleware *middleware.AuthMiddleware,
	cfg *config.Config,
) {

	handler := &EnvironmentHandler{
		environmentService: environmentService,
		containerService:   containerService,
		imageService:       imageService,
		imageUpdateService: imageUpdateService,
		updaterService:     updaterService,
		networkService:     networkService,
		volumeService:      volumeService,
		stackService:       stackService,
		settingsService:    settingsService,
		cfg:                cfg,
	}

	apiGroup := group.Group("/environments")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("", handler.ListEnvironments)
		apiGroup.POST("", handler.CreateEnvironment)
		apiGroup.GET("/:id", handler.GetEnvironment)
		apiGroup.PUT("/:id", handler.UpdateEnvironment)
		apiGroup.DELETE("/:id", handler.DeleteEnvironment)
		apiGroup.POST("/:id/test", handler.TestConnection)
		apiGroup.POST("/:id/heartbeat", handler.UpdateHeartbeat)

		apiGroup.POST("/:id/containers", handler.CreateContainer)
		apiGroup.GET("/:id/containers", handler.GetContainers)
		apiGroup.GET("/:id/containers/:containerId", handler.GetContainer)
		apiGroup.POST("/:id/containers/:containerId/pull", handler.PullContainerImage)
		apiGroup.POST("/:id/containers/:containerId/start", handler.StartContainer)
		apiGroup.POST("/:id/containers/:containerId/stop", handler.StopContainer)
		apiGroup.POST("/:id/containers/:containerId/restart", handler.RestartContainer)
		apiGroup.DELETE("/:id/containers/:containerId", handler.RemoveContainer)
		apiGroup.GET("/:id/containers/:containerId/logs", handler.GetContainerLogs)
		apiGroup.GET("/:id/containers/:containerId/logs/stream", handler.GetContainerLogsStream)
		apiGroup.GET("/:id/containers/:containerId/stats", handler.GetContainerStats)
		apiGroup.GET("/:id/containers/:containerId/stats/stream", handler.GetContainerStatsStream)

		apiGroup.GET("/:id/images", handler.GetImages)
		apiGroup.GET("/:id/images/:imageId", handler.GetImage)
		apiGroup.DELETE("/:id/images/:imageId", handler.RemoveImage)
		apiGroup.POST("/:id/images/pull", handler.PullImage)
		apiGroup.POST("/:id/images/prune", handler.PruneImages)
		apiGroup.GET("/:id/images/total-size", handler.GetTotalImageSize)

		apiGroup.GET("/:id/networks", handler.GetNetworks)
		apiGroup.POST("/:id/networks", handler.CreateNetwork)
		apiGroup.GET("/:id/networks/:networkId", handler.GetNetwork)
		apiGroup.DELETE("/:id/networks/:networkId", handler.RemoveNetwork)

		apiGroup.GET("/:id/volumes", handler.GetVolumes)
		apiGroup.POST("/:id/volumes", handler.CreateVolume)
		apiGroup.GET("/:id/volumes/:volumeName", handler.GetVolume)
		apiGroup.DELETE("/:id/volumes/:volumeName", handler.RemoveVolume)
		apiGroup.GET("/:id/volumes/:volumeName/usage", handler.GetVolumeUsage)
		apiGroup.POST("/:id/volumes/prune", handler.PruneVolumes)

		apiGroup.GET("/:id/stacks", handler.GetStacks)
		apiGroup.POST("/:id/stacks", handler.CreateStack)
		apiGroup.GET("/:id/stacks/:stackId", handler.GetStack)
		apiGroup.PUT("/:id/stacks/:stackId", handler.UpdateStack)
		apiGroup.DELETE("/:id/stacks/:stackId", handler.DeleteStack)
		apiGroup.POST("/:id/stacks/:stackId/start", handler.StartStack)
		apiGroup.POST("/:id/stacks/:stackId/deploy", handler.DeployStack)
		apiGroup.POST("/:id/stacks/:stackId/stop", handler.StopStack)
		apiGroup.POST("/:id/stacks/:stackId/restart", handler.RestartStack)
		apiGroup.GET("/:id/stacks/:stackId/services", handler.GetStackServices)
		apiGroup.POST("/:id/stacks/:stackId/pull", handler.PullStackImages)
		apiGroup.POST("/:id/stacks/:stackId/redeploy", handler.RedeployStack)
		apiGroup.POST("/:id/stacks/:stackId/down", handler.DownStack)
		apiGroup.DELETE("/:id/stacks/:stackId/destroy", handler.DestroyStack)
		apiGroup.GET("/:id/stacks/:stackId/logs/stream", handler.GetStackLogsStream)
		apiGroup.POST("/:id/stacks/convert", handler.ConvertDockerRun)

		// Image update endpoints
		apiGroup.GET("/:id/image-updates/check", handler.CheckImageUpdate)
		apiGroup.GET("/:id/image-updates/check/:imageId", handler.CheckImageUpdateByID)
		apiGroup.POST("/:id/image-updates/check-batch", handler.CheckMultipleImages)
		apiGroup.GET("/:id/image-updates/check-all", handler.CheckAllImages)
		apiGroup.GET("/:id/image-updates/summary", handler.GetUpdateSummary)
		apiGroup.GET("/:id/image-updates/versions", handler.GetImageVersions)
		apiGroup.POST("/:id/image-updates/compare", handler.CompareVersions)

		// Updater endpoints
		apiGroup.POST("/:id/updater/run", handler.UpdaterRun)
		apiGroup.GET("/:id/updater/status", handler.UpdaterStatus)
		apiGroup.GET("/:id/updater/history", handler.UpdaterHistory)

		apiGroup.POST("/:id/agent/pair", handler.PairAgent)
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

func (h *EnvironmentHandler) routeRequest(c *gin.Context, endpoint string) {
	environmentID := c.Param("id")

	if environmentID == LOCAL_DOCKER_ENVIRONMENT_ID {
		h.handleLocalRequest(c, endpoint)
		return
	}

	h.handleRemoteRequest(c, environmentID, endpoint)
}

func (h *EnvironmentHandler) handleLocalRequest(c *gin.Context, endpoint string) {
	if h.handleContainerEndpoints(c, endpoint) {
		return
	}
	if h.handleImageEndpoints(c, endpoint) {
		return
	}
	if h.handleImageUpdateEndpoints(c, endpoint) {
		return
	}
	if h.handleNetworkEndpoints(c, endpoint) {
		return
	}
	if h.handleVolumeEndpoints(c, endpoint) {
		return
	}
	if h.handleStackEndpoints(c, endpoint) {
		return
	}
	if h.handleUpdaterEndpoints(c, endpoint) {
		return
	}

	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"data":    gin.H{"error": "Endpoint not found"},
	})
}

func (h *EnvironmentHandler) handleUpdaterEndpoints(c *gin.Context, endpoint string) bool {
	updaterHandler := &UpdaterHandler{
		updaterService: h.updaterService,
	}
	switch {
	case endpoint == "/updater/run" && c.Request.Method == http.MethodPost:
		updaterHandler.Run(c)
		return true
	case endpoint == "/updater/status" && c.Request.Method == http.MethodGet:
		updaterHandler.Status(c)
		return true
	case endpoint == "/updater/history" && c.Request.Method == http.MethodGet:
		updaterHandler.History(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) UpdaterRun(c *gin.Context) {
	h.routeRequest(c, "/updater/run")
}
func (h *EnvironmentHandler) UpdaterStatus(c *gin.Context) {
	h.routeRequest(c, "/updater/status")
}
func (h *EnvironmentHandler) UpdaterHistory(c *gin.Context) {
	h.routeRequest(c, "/updater/history")
}

func (h *EnvironmentHandler) handleImageUpdateEndpoints(c *gin.Context, endpoint string) bool {
	imageUpdateHandler := &ImageUpdateHandler{
		imageUpdateService: h.imageUpdateService,
	}

	switch {
	case endpoint == "/image-updates/check" && c.Request.Method == http.MethodGet:
		imageUpdateHandler.CheckImageUpdate(c)
		return true
	case strings.HasPrefix(endpoint, "/image-updates/check/") && c.Request.Method == http.MethodGet:
		imageUpdateHandler.CheckImageUpdateByID(c)
		return true
	case endpoint == "/image-updates/check-batch" && c.Request.Method == http.MethodPost:
		imageUpdateHandler.CheckMultipleImages(c)
		return true
	case endpoint == "/image-updates/check-all" && c.Request.Method == http.MethodGet:
		imageUpdateHandler.CheckAllImages(c)
		return true
	case endpoint == "/image-updates/summary" && c.Request.Method == http.MethodGet:
		imageUpdateHandler.GetUpdateSummary(c)
		return true
	case endpoint == "/image-updates/versions" && c.Request.Method == http.MethodGet:
		imageUpdateHandler.GetImageVersions(c)
		return true
	case endpoint == "/image-updates/compare" && c.Request.Method == http.MethodPost:
		imageUpdateHandler.CompareVersions(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) CheckImageUpdate(c *gin.Context) {
	h.routeRequest(c, "/image-updates/check")
}

func (h *EnvironmentHandler) CheckImageUpdateByID(c *gin.Context) {
	imageID := c.Param("imageId")
	h.routeRequest(c, "/image-updates/check/"+imageID)
}

func (h *EnvironmentHandler) CheckMultipleImages(c *gin.Context) {
	h.routeRequest(c, "/image-updates/check-batch")
}

func (h *EnvironmentHandler) CheckAllImages(c *gin.Context) {
	h.routeRequest(c, "/image-updates/check-all")
}

func (h *EnvironmentHandler) GetUpdateSummary(c *gin.Context) {
	h.routeRequest(c, "/image-updates/summary")
}

func (h *EnvironmentHandler) GetImageVersions(c *gin.Context) {
	h.routeRequest(c, "/image-updates/versions")
}

func (h *EnvironmentHandler) CompareVersions(c *gin.Context) {
	h.routeRequest(c, "/image-updates/compare")
}

func (h *EnvironmentHandler) handleContainerEndpoints(c *gin.Context, endpoint string) bool {
	containerHandler := &ContainerHandler{
		containerService: h.containerService,
		imageService:     h.imageService,
	}

	switch {
	case endpoint == "/containers" && c.Request.Method == http.MethodGet:
		containerHandler.List(c)
		return true
	case endpoint == "/containers" && c.Request.Method == http.MethodPost:
		containerHandler.Create(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/start"):
		containerHandler.Start(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/stop"):
		containerHandler.Stop(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/restart"):
		containerHandler.Restart(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/pull"):
		containerHandler.PullImage(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/logs/stream"):
		containerHandler.GetLogsStream(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/logs"):
		containerHandler.GetLogs(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/stats/stream"):
		containerHandler.GetStatsStream(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/stats"):
		containerHandler.GetStats(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && c.Request.Method == http.MethodGet:
		containerHandler.GetByID(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && c.Request.Method == http.MethodDelete:
		containerHandler.Delete(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleImageEndpoints(c *gin.Context, endpoint string) bool {
	imageHandler := &ImageHandler{
		imageService:       h.imageService,
		imageUpdateService: nil,
	}

	switch {
	case endpoint == "/images" && c.Request.Method == http.MethodGet:
		imageHandler.List(c)
		return true
	case endpoint == "/images/total-size" && c.Request.Method == http.MethodGet:
		imageHandler.GetTotalSize(c)
		return true
	case endpoint == "/images/pull" && c.Request.Method == http.MethodPost:
		imageHandler.Pull(c)
		return true
	case endpoint == "/images/prune" && c.Request.Method == http.MethodPost:
		imageHandler.Prune(c)
		return true
	case strings.HasPrefix(endpoint, "/images/") && c.Request.Method == http.MethodGet:
		imageHandler.GetByID(c)
		return true
	case strings.HasPrefix(endpoint, "/images/") && c.Request.Method == http.MethodDelete:
		imageHandler.Remove(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleNetworkEndpoints(c *gin.Context, endpoint string) bool {
	networkHandler := &NetworkHandler{
		networkService: h.networkService,
	}

	switch {
	case endpoint == "/networks" && c.Request.Method == http.MethodGet:
		networkHandler.List(c)
		return true
	case endpoint == "/networks" && c.Request.Method == http.MethodPost:
		networkHandler.Create(c)
		return true
	case strings.HasPrefix(endpoint, "/networks/") && c.Request.Method == http.MethodGet:
		networkHandler.GetByID(c)
		return true
	case strings.HasPrefix(endpoint, "/networks/") && c.Request.Method == http.MethodDelete:
		networkHandler.Remove(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleVolumeEndpoints(c *gin.Context, endpoint string) bool {
	volumeHandler := &VolumeHandler{
		volumeService: h.volumeService,
	}

	switch {
	case endpoint == "/volumes" && c.Request.Method == http.MethodGet:
		volumeHandler.List(c)
		return true
	case endpoint == "/volumes" && c.Request.Method == http.MethodPost:
		volumeHandler.Create(c)
		return true
	case endpoint == "/volumes/prune" && c.Request.Method == http.MethodPost:
		volumeHandler.Prune(c)
		return true
	case strings.HasPrefix(endpoint, "/volumes/") && strings.HasSuffix(endpoint, "/usage"):
		volumeHandler.GetUsage(c)
		return true
	case strings.HasPrefix(endpoint, "/volumes/") && c.Request.Method == http.MethodGet:
		volumeHandler.GetByName(c)
		return true
	case strings.HasPrefix(endpoint, "/volumes/") && c.Request.Method == http.MethodDelete:
		volumeHandler.Remove(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleStackEndpoints(c *gin.Context, endpoint string) bool {
	stackHandler := &StackHandler{
		stackService: h.stackService,
	}

	switch {
	case endpoint == "/stacks" && c.Request.Method == http.MethodGet:
		stackHandler.ListStacks(c)
		return true
	case endpoint == "/stacks" && c.Request.Method == http.MethodPost:
		stackHandler.CreateStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/deploy"):
		stackHandler.DeployStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/start"):
		stackHandler.StartStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/stop"):
		stackHandler.StopStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/restart"):
		stackHandler.RestartStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/services"):
		stackHandler.GetStackServices(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/pull"):
		stackHandler.PullImages(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/redeploy"):
		stackHandler.RedeployStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/down"):
		stackHandler.DownStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/destroy"):
		stackHandler.DestroyStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/logs/stream"):
		stackHandler.GetStackLogsStream(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && c.Request.Method == http.MethodGet:
		stackHandler.GetStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && c.Request.Method == http.MethodPut:
		stackHandler.UpdateStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && c.Request.Method == http.MethodDelete:
		stackHandler.DeleteStack(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleRemoteRequest(c *gin.Context, environmentID string, endpoint string) {
	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil || environment == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": gin.H{"error": "Environment not found"}})
		return
	}
	if !environment.Enabled {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Environment is disabled"}})
		return
	}

	target := strings.TrimRight(environment.ApiUrl, "/") +
		"/api/environments/" + LOCAL_DOCKER_ENVIRONMENT_ID + endpoint
	if qs := c.Request.URL.RawQuery; qs != "" {
		target += "?" + qs
	}

	var reqBody io.Reader
	if c.Request.Body != nil {
		buf, _ := io.ReadAll(c.Request.Body)
		// reset original body in case other middlewares need it later
		c.Request.Body = io.NopCloser(bytes.NewBuffer(buf))
		reqBody = bytes.NewReader(buf)
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, target, reqBody)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to create proxy request"}})
		return
	}

	// Copy headers except hop-by-hop and Authorization (we’ll set explicitly)
	skip := map[string]struct{}{
		"Host":                           {},
		"Connection":                     {},
		"Keep-Alive":                     {},
		"Proxy-Authenticate":             {},
		"Proxy-Authorization":            {},
		"Te":                             {},
		"Trailer":                        {},
		"Transfer-Encoding":              {},
		"Upgrade":                        {},
		"Content-Length":                 {},
		"Origin":                         {},
		"Referer":                        {},
		"Access-Control-Request-Method":  {},
		"Access-Control-Request-Headers": {},
		"Cookie":                         {},
	}
	for k, vs := range c.Request.Header {
		ck := http.CanonicalHeaderKey(k)
		if _, ok := skip[ck]; ok || ck == "Authorization" {
			continue
		}
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}

	// Forward Authorization (or promote cookie)
	if auth := c.GetHeader("Authorization"); auth != "" {
		req.Header.Set("Authorization", auth)
	} else if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
		req.Header.Set("Authorization", "Bearer "+cookieToken)
	}

	// Forward agent token if stored
	if environment.AccessToken != nil && *environment.AccessToken != "" {
		req.Header.Set("X-Arcane-Agent-Token", *environment.AccessToken)
	}

	req.Header.Set("X-Forwarded-For", c.ClientIP())
	req.Header.Set("X-Forwarded-Host", c.Request.Host)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "data": gin.H{"error": fmt.Sprintf("Proxy request failed: %v", err)}})
		return
	}
	defer resp.Body.Close()

	// Skip hop-by-hop headers and any named in the Connection header (RFC 7230)
	hop := map[string]struct{}{
		http.CanonicalHeaderKey("Connection"):          {},
		http.CanonicalHeaderKey("Keep-Alive"):          {},
		http.CanonicalHeaderKey("Proxy-Authenticate"):  {},
		http.CanonicalHeaderKey("Proxy-Authorization"): {},
		http.CanonicalHeaderKey("TE"):                  {},
		http.CanonicalHeaderKey("Trailers"):            {},
		http.CanonicalHeaderKey("Trailer"):             {},
		http.CanonicalHeaderKey("Transfer-Encoding"):   {},
		http.CanonicalHeaderKey("Upgrade"):             {},
	}

	for _, connVal := range resp.Header.Values("Connection") {
		for _, token := range strings.Split(connVal, ",") {
			if t := strings.TrimSpace(token); t != "" {
				hop[http.CanonicalHeaderKey(t)] = struct{}{}
			}
		}
	}

	// Copy response headers except hop-by-hop
	for k, vs := range resp.Header {
		ck := http.CanonicalHeaderKey(k)
		if _, ok := hop[ck]; ok {
			continue
		}
		for _, v := range vs {
			c.Writer.Header().Add(k, v)
		}
	}

	c.Status(resp.StatusCode)

	if c.Request.Method != http.MethodHead {
		_, _ = io.Copy(c.Writer, resp.Body)
	}
}

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

func (h *EnvironmentHandler) GetContainers(c *gin.Context) {
	h.routeRequest(c, "/containers")
}

func (h *EnvironmentHandler) GetImages(c *gin.Context) {
	h.routeRequest(c, "/images")
}

func (h *EnvironmentHandler) GetNetworks(c *gin.Context) {
	h.routeRequest(c, "/networks")
}

func (h *EnvironmentHandler) GetVolumes(c *gin.Context) {
	h.routeRequest(c, "/volumes")
}

func (h *EnvironmentHandler) GetStacks(c *gin.Context) {
	h.routeRequest(c, "/stacks")
}

func (h *EnvironmentHandler) CreateNetwork(c *gin.Context) {
	h.routeRequest(c, "/networks")
}

func (h *EnvironmentHandler) CreateVolume(c *gin.Context) {
	h.routeRequest(c, "/volumes")
}

func (h *EnvironmentHandler) CreateStack(c *gin.Context) {
	h.routeRequest(c, "/stacks")
}

// Containers

func (h *EnvironmentHandler) GetContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID)
}

func (h *EnvironmentHandler) StartContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/start")
}

func (h *EnvironmentHandler) StopContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/stop")
}

func (h *EnvironmentHandler) CreateContainer(c *gin.Context) {
	h.routeRequest(c, "/containers")
}

func (h *EnvironmentHandler) PullContainerImage(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/pull")
}

func (h *EnvironmentHandler) RestartContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/restart")
}

func (h *EnvironmentHandler) RemoveContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID)
}

func (h *EnvironmentHandler) GetContainerLogs(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/logs")
}

func (h *EnvironmentHandler) GetContainerStats(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/stats")
}

func (h *EnvironmentHandler) GetContainerStatsStream(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/stats/stream")
}

func (h *EnvironmentHandler) GetContainerLogsStream(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/logs/stream")
}

// End Containers

// Images

func (h *EnvironmentHandler) GetImage(c *gin.Context) {
	imageID := c.Param("imageId")
	h.routeRequest(c, "/images/"+imageID)
}

func (h *EnvironmentHandler) GetTotalImageSize(c *gin.Context) {
	h.routeRequest(c, "/images/total-size")
}

func (h *EnvironmentHandler) RemoveImage(c *gin.Context) {
	imageID := c.Param("imageId")
	h.routeRequest(c, "/images/"+imageID)
}

func (h *EnvironmentHandler) PullImage(c *gin.Context) {
	h.routeRequest(c, "/images/pull")
}

func (h *EnvironmentHandler) PruneImages(c *gin.Context) {
	h.routeRequest(c, "/images/prune")
}

// End Images

func (h *EnvironmentHandler) GetNetwork(c *gin.Context) {
	networkID := c.Param("networkId")
	h.routeRequest(c, "/networks/"+networkID)
}

func (h *EnvironmentHandler) RemoveNetwork(c *gin.Context) {
	networkID := c.Param("networkId")
	h.routeRequest(c, "/networks/"+networkID)
}

func (h *EnvironmentHandler) GetVolume(c *gin.Context) {
	volumeName := c.Param("volumeName")
	h.routeRequest(c, "/volumes/"+volumeName)
}

func (h *EnvironmentHandler) RemoveVolume(c *gin.Context) {
	volumeName := c.Param("volumeName")
	h.routeRequest(c, "/volumes/"+volumeName)
}

func (h *EnvironmentHandler) PruneVolumes(c *gin.Context) {
	h.routeRequest(c, "/volumes/prune")
}

func (h *EnvironmentHandler) GetStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId)
}

func (h *EnvironmentHandler) StartStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/start")
}

func (h *EnvironmentHandler) UpdateStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId)
}

func (h *EnvironmentHandler) DeleteStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId)
}

func (h *EnvironmentHandler) StopStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/stop")
}

func (h *EnvironmentHandler) RestartStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/restart")
}

func (h *EnvironmentHandler) GetStackLogs(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/logs")
}

func (h *EnvironmentHandler) GetVolumeUsage(c *gin.Context) {
	h.routeRequest(c, "/volumes/"+c.Param("volumeName")+"/usage")
}

func (h *EnvironmentHandler) DeployStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/deploy")
}

func (h *EnvironmentHandler) GetStackServices(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/services")
}

func (h *EnvironmentHandler) PullStackImages(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/pull")
}

func (h *EnvironmentHandler) RedeployStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/redeploy")
}

func (h *EnvironmentHandler) DownStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/down")
}

func (h *EnvironmentHandler) DestroyStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/destroy")
}

func (h *EnvironmentHandler) GetStackLogsStream(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/logs/stream")
}

func (h *EnvironmentHandler) ConvertDockerRun(c *gin.Context) {
	h.routeRequest(c, "/stacks/convert")
}
