package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type PollingDebugHandler struct {
	scheduler       *services.PollingScheduler
	workerPool      *services.PollingWorkerPool
	digestCache     *services.DigestCache
	db              *database.DB
	settingsService *services.SettingsService
	projectService  *services.ProjectService
}

func NewPollingDebugHandler(
	scheduler *services.PollingScheduler,
	workerPool *services.PollingWorkerPool,
	digestCache *services.DigestCache,
	db *database.DB,
	settingsService *services.SettingsService,
	projectService *services.ProjectService,
) *PollingDebugHandler {
	return &PollingDebugHandler{
		scheduler:       scheduler,
		workerPool:      workerPool,
		digestCache:     digestCache,
		db:              db,
		settingsService: settingsService,
		projectService:  projectService,
	}
}

type PollingDebugResponse struct {
	Timestamp        time.Time             `json:"timestamp"`
	Settings         PollingSettings       `json:"settings"`
	Scheduler        SchedulerState        `json:"scheduler"`
	WorkerPool       WorkerPoolState       `json:"worker_pool"`
	DigestCache      DigestCacheState      `json:"digest_cache"`
	Schedules        []ScheduleInfo        `json:"schedules"`
	ProjectOverrides []ProjectOverrideInfo `json:"project_overrides"`
}

type PollingSettings struct {
	GlobalEnabled  bool `json:"global_enabled"`
	GlobalInterval int  `json:"global_interval_minutes"`
	WorkerCount    int  `json:"worker_count"`
}

type SchedulerState struct {
	Size   int    `json:"size"`
	Status string `json:"status"`
}

type WorkerPoolState struct {
	WorkerCount int    `json:"worker_count"`
	QueueSize   int    `json:"queue_size"`
	Status      string `json:"status"`
}

type DigestCacheState struct {
	Size   int    `json:"size"`
	Status string `json:"status"`
}

type ScheduleInfo struct {
	ProjectID           *string    `json:"project_id"`
	ProjectName         *string    `json:"project_name"`
	NextPollTime        time.Time  `json:"next_poll_time"`
	LastPollTime        *time.Time `json:"last_poll_time"`
	LastPollDurationMs  *int       `json:"last_poll_duration_ms"`
	ConsecutiveFailures int        `json:"consecutive_failures"`
	TimeUntilNextPoll   string     `json:"time_until_next_poll"`
	IsOverdue           bool       `json:"is_overdue"`
}

type ProjectOverrideInfo struct {
	ProjectID       string `json:"project_id"`
	ProjectName     string `json:"project_name"`
	PollingEnabled  *bool  `json:"polling_enabled"`
	PollingInterval *int   `json:"polling_interval"`
	HasSchedule     bool   `json:"has_schedule"`
}

func (h *PollingDebugHandler) GetPollingDebugInfo(c *gin.Context) {
	ctx := c.Request.Context()

	// Get settings
	settings := PollingSettings{
		GlobalEnabled:  h.settingsService.GetBoolSetting(ctx, "pollingEnabled", true),
		GlobalInterval: h.settingsService.GetIntSetting(ctx, "pollingInterval", 60),
		WorkerCount:    h.settingsService.GetIntSetting(ctx, "pollingWorkerCount", 10),
	}

	// Get scheduler state
	schedulerState := SchedulerState{
		Size:   h.scheduler.Size(),
		Status: "active",
	}

	// Get worker pool state
	workerPoolState := WorkerPoolState{
		WorkerCount: settings.WorkerCount,
		QueueSize:   h.workerPool.QueueSize(),
		Status:      "active",
	}

	// Get digest cache state
	digestCacheState := DigestCacheState{
		Size:   h.digestCache.Size(),
		Status: "active",
	}

	// Get schedules from database
	var dbSchedules []models.PollingSchedule
	if err := h.db.WithContext(ctx).Find(&dbSchedules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch schedules from database",
		})
		return
	}

	// Get all projects for name lookup
	projects, err := h.projectService.ListAllProjects(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch projects",
		})
		return
	}

	projectMap := make(map[string]models.Project)
	for _, proj := range projects {
		projectMap[proj.ID] = proj
	}

	// Build schedule info
	now := time.Now()
	schedules := make([]ScheduleInfo, 0, len(dbSchedules))
	scheduleProjectIDs := make(map[string]bool)

	for _, sched := range dbSchedules {
		var projectName *string
		if sched.ProjectID != nil {
			scheduleProjectIDs[*sched.ProjectID] = true
			if proj, ok := projectMap[*sched.ProjectID]; ok {
				projectName = &proj.Name
			}
		} else {
			globalName := "Global Polling"
			projectName = &globalName
		}

		timeUntil := time.Until(sched.NextPollTime)
		timeUntilStr := timeUntil.Round(time.Second).String()
		if timeUntil < 0 {
			timeUntilStr = "overdue by " + (-timeUntil).Round(time.Second).String()
		}

		schedules = append(schedules, ScheduleInfo{
			ProjectID:           sched.ProjectID,
			ProjectName:         projectName,
			NextPollTime:        sched.NextPollTime,
			LastPollTime:        sched.LastPollTime,
			LastPollDurationMs:  sched.LastPollDurationMs,
			ConsecutiveFailures: sched.ConsecutiveFailures,
			TimeUntilNextPoll:   timeUntilStr,
			IsOverdue:           sched.NextPollTime.Before(now),
		})
	}

	// Build project overrides info
	projectOverrides := make([]ProjectOverrideInfo, 0)
	for _, proj := range projects {
		if proj.PollingEnabled != nil || proj.PollingInterval != nil {
			projectOverrides = append(projectOverrides, ProjectOverrideInfo{
				ProjectID:       proj.ID,
				ProjectName:     proj.Name,
				PollingEnabled:  proj.PollingEnabled,
				PollingInterval: proj.PollingInterval,
				HasSchedule:     scheduleProjectIDs[proj.ID],
			})
		}
	}

	response := PollingDebugResponse{
		Timestamp:        time.Now(),
		Settings:         settings,
		Scheduler:        schedulerState,
		WorkerPool:       workerPoolState,
		DigestCache:      digestCacheState,
		Schedules:        schedules,
		ProjectOverrides: projectOverrides,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}
