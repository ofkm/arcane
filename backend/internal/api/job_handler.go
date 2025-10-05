package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type JobHandler struct {
	jobService *services.JobService
}

// hasRole checks if user has a specific role
func hasRole(user *models.User, role string) bool {
	for _, r := range user.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func NewJobHandler(group *gin.RouterGroup, jobService *services.JobService, authMiddleware *middleware.AuthMiddleware) {
	handler := &JobHandler{jobService: jobService}

	apiGroup := group.Group("/jobs")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("", handler.List)
		apiGroup.GET("/:jobId", handler.Get)
		apiGroup.POST("/:jobId/cancel", handler.Cancel)
		apiGroup.GET("/stats", handler.GetStats)
	}
}

func (h *JobHandler) List(c *gin.Context) {
	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	// Parse query parameters
	status := c.Query("status")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	userID := c.Query("userId")

	isAdmin := hasRole(currentUser, "admin")

	// Non-admin users can only see their own jobs
	if !isAdmin && userID != "" && userID != currentUser.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot view other users' jobs",
		})
		return
	}

	// If non-admin and no userId specified, show only their jobs
	if !isAdmin && userID == "" {
		userID = currentUser.ID
	}

	var jobStatus models.JobStatus
	if status != "" {
		jobStatus = models.JobStatus(status)
	}

	jobs, total, err := h.jobService.ListJobs(c.Request.Context(), userID, jobStatus, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list jobs: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"jobs":   jobs,
			"total":  total,
			"limit":  limit,
			"offset": offset,
		},
	})
}

func (h *JobHandler) Get(c *gin.Context) {
	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	jobID := c.Param("jobId")

	job, err := h.jobService.GetJob(c.Request.Context(), jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Job not found",
		})
		return
	}

	isAdmin := hasRole(currentUser, "admin")

	// Non-admin users can only see their own jobs
	if !isAdmin && job.UserID != currentUser.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot view this job",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    job,
	})
}

func (h *JobHandler) Cancel(c *gin.Context) {
	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	jobID := c.Param("jobId")

	// Get job to check ownership
	job, err := h.jobService.GetJob(c.Request.Context(), jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Job not found",
		})
		return
	}

	isAdmin := hasRole(currentUser, "admin")

	// Only allow user to cancel their own jobs (or admin)
	if !isAdmin && job.UserID != currentUser.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot cancel this job",
		})
		return
	}

	if err := h.jobService.CancelJob(c.Request.Context(), jobID, currentUser.ID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Job cancellation requested"},
	})
}

func (h *JobHandler) GetStats(c *gin.Context) {
	currentUser, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	userID := c.Query("userId")
	isAdmin := hasRole(currentUser, "admin")

	// Non-admin users can only see their own stats
	if !isAdmin && userID != "" && userID != currentUser.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot view other users' stats",
		})
		return
	}

	if !isAdmin && userID == "" {
		userID = currentUser.ID
	}

	stats, err := h.jobService.GetJobStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get job stats: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}
