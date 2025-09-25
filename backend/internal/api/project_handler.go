package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
	ws "github.com/ofkm/arcane-backend/internal/utils/ws"
)

type ProjectHandler struct {
	projectService *services.ProjectService
	logStreams     sync.Map
}

var wsUpgrader = websocket.Upgrader{
	CheckOrigin:       func(r *http.Request) bool { return true },
	ReadBufferSize:    32 * 1024,
	WriteBufferSize:   32 * 1024,
	EnableCompression: true,
}

type projectLogStream struct {
	hub    *ws.Hub
	once   sync.Once
	cancel context.CancelFunc
	format string
	seq    atomic.Uint64
}

func NewProjectHandler(group *gin.RouterGroup, projectService *services.ProjectService, authMiddleware *middleware.AuthMiddleware) {

	handler := &ProjectHandler{projectService: projectService}

	apiGroup := group.Group("/environments/:id/projects")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/counts", handler.GetProjectStatusCounts)
		apiGroup.GET("/", handler.ListProjects)
		apiGroup.POST("/:projectId/up", handler.DeployProject)
		apiGroup.POST("/:projectId/down", handler.DownProject)
		apiGroup.POST("/", handler.CreateProject)
		apiGroup.GET("/:projectId", handler.GetProject)
		apiGroup.POST("/:projectId/pull", handler.PullProjectImages)
		apiGroup.POST("/:projectId/redeploy", handler.RedeployProject)
		apiGroup.DELETE("/:projectId/destroy", handler.DestroyProject)
		apiGroup.PUT("/:projectId", handler.UpdateProject)
		apiGroup.POST("/:projectId/restart", handler.RestartProject)
		apiGroup.GET("/:projectId/logs/ws", handler.GetProjectLogsWS)

	}
}

func (h *ProjectHandler) ListProjects(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid pagination or sort parameters: " + err.Error(),
		})
		return
	}

	projectsResponse, pagination, err := h.projectService.ListProjects(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			c.JSON(http.StatusRequestTimeout, gin.H{
				"success": false,
				"error":   "Request was canceled",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list projects: " + err.Error(),
		})
		return
	}
	if projectsResponse == nil {
		projectsResponse = []dto.ProjectDetailsDto{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       projectsResponse,
		"pagination": pagination,
	})
}

func (h *ProjectHandler) DeployProject(c *gin.Context) {
	projectID := c.Param("projectId")

	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Project ID is required",
		})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.projectService.DeployProject(c.Request.Context(), projectID, *user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Project deployed successfully"},
	})
}

func (h *ProjectHandler) DownProject(c *gin.Context) {
	projectID := c.Param("projectId")

	user, _ := middleware.GetCurrentUser(c)
	if err := h.projectService.DownProject(c.Request.Context(), projectID, *user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to bring down project: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Project brought down successfully"},
	})
}

func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req dto.CreateProjectDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	proj, err := h.projectService.CreateProject(c.Request.Context(), req.Name, req.ComposeContent, req.EnvContent, *user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	var response dto.CreateProjectReponseDto
	if err := dto.MapStruct(proj, &response); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to map response"})
		return
	}
	response.Status = string(proj.Status)
	response.CreatedAt = proj.CreatedAt.Format(time.RFC3339)
	response.UpdatedAt = proj.UpdatedAt.Format(time.RFC3339)
	response.DirName = utils.DerefString(proj.DirName)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
	})
}

func (h *ProjectHandler) GetProject(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project ID is required"})
		return
	}

	details, err := h.projectService.GetProjectDetails(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    details,
	})
}

func (h *ProjectHandler) RedeployProject(c *gin.Context) {
	projectID := c.Param("projectId")

	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Project ID is required",
		})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.projectService.RedeployProject(c.Request.Context(), projectID, *user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Project redeployed successfully"},
	})
}

func (h *ProjectHandler) DestroyProject(c *gin.Context) {
	projectID := c.Param("projectId")

	var req dto.DestroyProjectDto
	if err := c.ShouldBindJSON(&req); err != nil {
		req = dto.DestroyProjectDto{
			RemoveFiles:   false,
			RemoveVolumes: false,
		}
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.projectService.DestroyProject(c.Request.Context(), projectID, req.RemoveFiles, req.RemoveVolumes, *user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to destroy project: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Project destroyed successfully"},
	})
}

func (h *ProjectHandler) PullProjectImages(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project ID is required"})
		return
	}

	c.Writer.Header().Set("Content-Type", "application/x-json-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	_, _ = fmt.Fprintln(c.Writer, `{"status":"starting project image pull"}`)

	if err := h.projectService.PullProjectImages(c.Request.Context(), projectID, c.Writer); err != nil {
		_, _ = fmt.Fprintf(c.Writer, `{"error":%q}`+"\n", err.Error())
		return
	}

	_, _ = fmt.Fprintln(c.Writer, `{"status":"complete"}`)
}

func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project ID is required"})
		return
	}

	var req dto.UpdateProjectDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid request format"})
		return
	}

	if _, err := h.projectService.UpdateProject(c.Request.Context(), projectID, req.Name, req.ComposeContent, req.EnvContent); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	details, err := h.projectService.GetProjectDetails(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to fetch updated project details"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    details,
	})
}

func (h *ProjectHandler) RestartProject(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project ID is required"})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.projectService.RestartProject(c.Request.Context(), projectID, *user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Project restarted successfully"},
	})
}

func (h *ProjectHandler) getOrStartProjectLogHub(projectID, format string, batched bool, follow bool, tail, since string, timestamps bool) *ws.Hub {
	key := projectID + "::" + format
	v, _ := h.logStreams.LoadOrStore(key, &projectLogStream{
		hub:    ws.NewHub(1024),
		format: format,
	})
	ls := v.(*projectLogStream)

	ls.once.Do(func() {
		ctx, cancel := context.WithCancel(context.Background())
		ls.cancel = cancel
		go ls.hub.Run(ctx)

		lines := make(chan string, 256)
		go func() {
			defer close(lines)
			_ = h.projectService.StreamProjectLogs(ctx, projectID, lines, follow, tail, since, timestamps)
		}()

		if format == "json" {
			msgs := make(chan ws.LogMessage, 256)
			go func() {
				defer close(msgs)
				for line := range lines {
					level, service, msg, ts := ws.NormalizeProjectLine(line)
					seq := ls.seq.Add(1)
					timestamp := ts
					if timestamp == "" {
						timestamp = ws.NowRFC3339()
					}
					msgs <- ws.LogMessage{
						Seq:       seq,
						Level:     level,
						Message:   msg,
						Service:   service,
						Timestamp: timestamp,
					}
				}
			}()
			if batched {
				go ws.ForwardLogJSONBatched(ctx, ls.hub, msgs, 50, 400*time.Millisecond)
			} else {
				go ws.ForwardLogJSON(ctx, ls.hub, msgs)
			}
		} else {
			cleanChan := make(chan string, 256)
			go func() {
				defer close(cleanChan)
				for line := range lines {
					_, _, msg, _ := ws.NormalizeProjectLine(line)
					cleanChan <- msg
				}
			}()
			go ws.ForwardLines(ctx, ls.hub, cleanChan)
		}
	})

	return ls.hub
}

func (h *ProjectHandler) GetProjectLogsWS(c *gin.Context) {
	projectID := c.Param("projectId")
	if strings.TrimSpace(projectID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project ID is required"})
		return
	}

	follow := c.DefaultQuery("follow", "true") == "true"
	tail := c.DefaultQuery("tail", "100")
	since := c.Query("since")
	timestamps := c.DefaultQuery("timestamps", "false") == "true"
	format := c.DefaultQuery("format", "text")
	batched := c.DefaultQuery("batched", "false") == "true"

	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	hub := h.getOrStartProjectLogHub(projectID, format, batched, follow, tail, since, timestamps)
	ws.ServeClient(context.Background(), hub, conn)
}

func (h *ProjectHandler) GetProjectStatusCounts(c *gin.Context) {
	_, running, stopped, total, err := h.projectService.GetProjectStatusCounts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get project counts: " + err.Error()},
		})
		return
	}

	out := dto.ProjectStatusCounts{
		RunningProjects: int(running),
		StoppedProjects: int(stopped),
		TotalProjects:   int(total),
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}
