package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type PollingHealthHandler struct {
	scheduler   *services.PollingScheduler
	workerPool  *services.PollingWorkerPool
	digestCache *services.DigestCache
	db          *database.DB
}

func NewPollingHealthHandler(
	scheduler *services.PollingScheduler,
	workerPool *services.PollingWorkerPool,
	digestCache *services.DigestCache,
	db *database.DB,
) *PollingHealthHandler {
	return &PollingHealthHandler{
		scheduler:   scheduler,
		workerPool:  workerPool,
		digestCache: digestCache,
		db:          db,
	}
}

type PollingHealthResponse struct {
	Status              string            `json:"status"` // "healthy", "degraded", "unhealthy"
	Timestamp           time.Time         `json:"timestamp"`
	Scheduler           SchedulerHealth   `json:"scheduler"`
	WorkerPool          WorkerPoolHealth  `json:"worker_pool"`
	DigestCache         DigestCacheHealth `json:"digest_cache"`
	LastSuccessfulPoll  *time.Time        `json:"last_successful_poll,omitempty"`
	ConsecutiveFailures int               `json:"consecutive_failures"`
	Issues              []string          `json:"issues,omitempty"`
}

type SchedulerHealth struct {
	Active        bool   `json:"active"`
	ScheduleCount int    `json:"schedule_count"`
	Status        string `json:"status"`
}

type WorkerPoolHealth struct {
	Active      bool   `json:"active"`
	WorkerCount int    `json:"worker_count"`
	QueueSize   int    `json:"queue_size"`
	Status      string `json:"status"`
}

type DigestCacheHealth struct {
	Size    int     `json:"size"`
	MaxSize int     `json:"max_size"`
	HitRate float64 `json:"hit_rate"`
	Status  string  `json:"status"`
}

func (h *PollingHealthHandler) GetPollingHealth(c *gin.Context) {
	ctx := c.Request.Context()
	now := time.Now()

	response := PollingHealthResponse{
		Status:    "healthy",
		Timestamp: now,
		Issues:    []string{},
	}

	// Check scheduler health
	schedulerSize := h.scheduler.Size()
	response.Scheduler = SchedulerHealth{
		Active:        true,
		ScheduleCount: schedulerSize,
		Status:        "healthy",
	}

	if schedulerSize == 0 {
		response.Scheduler.Status = "warning"
		response.Issues = append(response.Issues, "No polling schedules active")
	}

	// Check worker pool health
	queueSize := h.workerPool.QueueSize()
	response.WorkerPool = WorkerPoolHealth{
		Active:      true,
		WorkerCount: 10, // TODO: Get from config
		QueueSize:   queueSize,
		Status:      "healthy",
	}

	if queueSize > 50 {
		response.WorkerPool.Status = "degraded"
		response.Issues = append(response.Issues, "Worker pool queue is backing up")
		response.Status = "degraded"
	}

	// Check digest cache health
	cacheStats := h.digestCache.GetStats()
	response.DigestCache = DigestCacheHealth{
		Size:    cacheStats.Size,
		MaxSize: cacheStats.MaxSize,
		HitRate: cacheStats.HitRate,
		Status:  "healthy",
	}

	if float64(cacheStats.Size) > float64(cacheStats.MaxSize)*0.9 {
		response.DigestCache.Status = "warning"
		response.Issues = append(response.Issues, "Digest cache is near capacity")
	}

	// Check last successful poll time
	var recentSchedules []models.PollingSchedule
	if err := h.db.WithContext(ctx).
		Where("last_poll_time IS NOT NULL").
		Order("last_poll_time DESC").
		Limit(1).
		Find(&recentSchedules).Error; err == nil && len(recentSchedules) > 0 {
		response.LastSuccessfulPoll = recentSchedules[0].LastPollTime

		// Check if last poll was too long ago
		if response.LastSuccessfulPoll != nil {
			timeSinceLastPoll := now.Sub(*response.LastSuccessfulPoll)
			if timeSinceLastPoll > 2*time.Hour {
				response.Status = "degraded"
				response.Issues = append(response.Issues, "No successful polls in over 2 hours")
			}
		}
	}

	// Check for high consecutive failures
	var failedSchedules []models.PollingSchedule
	if err := h.db.WithContext(ctx).
		Where("consecutive_failures > ?", 0).
		Order("consecutive_failures DESC").
		Limit(1).
		Find(&failedSchedules).Error; err == nil && len(failedSchedules) > 0 {
		response.ConsecutiveFailures = failedSchedules[0].ConsecutiveFailures

		if response.ConsecutiveFailures > 5 {
			response.Status = "degraded"
			response.Issues = append(response.Issues, "High consecutive failure count detected")
		}

		if response.ConsecutiveFailures > 10 {
			response.Status = "unhealthy"
		}
	}

	// Determine overall status
	if len(response.Issues) == 0 {
		response.Status = "healthy"
	}

	// Return appropriate HTTP status code
	statusCode := http.StatusOK
	switch response.Status {
	case "degraded":
		statusCode = http.StatusOK
	case "unhealthy":
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, gin.H{
		"success": true,
		"data":    response,
	})
}

// CleanupOrphanedSchedules removes schedules for projects that no longer exist
func (h *PollingHealthHandler) CleanupOrphanedSchedules(c *gin.Context) {
	ctx := c.Request.Context()

	// Get all schedules
	var schedules []models.PollingSchedule
	if err := h.db.WithContext(ctx).Find(&schedules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch schedules",
		})
		return
	}

	removedCount := 0
	errors := []string{}

	for _, schedule := range schedules {
		// Skip global schedule (nil project_id)
		if schedule.ProjectID == nil {
			continue
		}

		// Check if project exists
		var project models.Project
		err := h.db.WithContext(ctx).Where("id = ?", *schedule.ProjectID).First(&project).Error

		if err != nil {
			// Project doesn't exist, remove schedule
			if removeErr := h.scheduler.Remove(schedule.ProjectID); removeErr != nil {
				errors = append(errors, "Failed to remove schedule for project "+*schedule.ProjectID)
			} else {
				removedCount++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"removed_count": removedCount,
		"errors":        errors,
	})
}

// GetPollingMetrics returns Prometheus-compatible metrics
func (h *PollingHealthHandler) GetPollingMetrics(c *gin.Context) {
	ctx := c.Request.Context()

	cacheStats := h.digestCache.GetStats()
	schedulerSize := h.scheduler.Size()
	queueSize := h.workerPool.QueueSize()

	// Get polling statistics
	var schedules []models.PollingSchedule
	_ = h.db.WithContext(ctx).Find(&schedules).Error

	totalFailures := 0
	avgDuration := 0.0
	pollCount := 0

	for _, sched := range schedules {
		totalFailures += sched.ConsecutiveFailures
		if sched.LastPollDurationMs != nil {
			avgDuration += float64(*sched.LastPollDurationMs)
			pollCount++
		}
	}

	if pollCount > 0 {
		avgDuration /= float64(pollCount)
	}

	// Return metrics in a simple format
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"metrics": gin.H{
			"scheduler_size":             schedulerSize,
			"worker_pool_queue_size":     queueSize,
			"cache_size":                 cacheStats.Size,
			"cache_max_size":             cacheStats.MaxSize,
			"cache_hit_rate":             cacheStats.HitRate,
			"cache_hits":                 cacheStats.Hits,
			"cache_misses":               cacheStats.Misses,
			"cache_evictions":            cacheStats.Evictions,
			"total_consecutive_failures": totalFailures,
			"average_poll_duration_ms":   avgDuration,
			"schedule_count":             len(schedules),
		},
	})
}
