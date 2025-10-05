package services

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

// JobExecutor is a function that executes a job
type JobExecutor func(ctx context.Context, job *models.Job, updateProgress func(progress int, message string)) error

// JobService manages asynchronous job execution
type JobService struct {
	db        *database.DB
	executors map[models.JobType]JobExecutor
	cancels   sync.Map // map[jobID]context.CancelFunc
	mu        sync.RWMutex
}

func NewJobService(db *database.DB) *JobService {
	return &JobService{
		db:        db,
		executors: make(map[models.JobType]JobExecutor),
	}
}

// RegisterExecutor registers a job executor for a specific job type
func (s *JobService) RegisterExecutor(jobType models.JobType, executor JobExecutor) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.executors[jobType] = executor
}

// CreateJob creates a new job in the database
func (s *JobService) CreateJob(ctx context.Context, jobType models.JobType, user models.User, metadata models.JSON) (*models.Job, error) {
	job := &models.Job{
		Type:        jobType,
		Status:      models.JobStatusPending,
		Progress:    0,
		UserID:      user.ID,
		Username:    user.Username,
		Metadata:    metadata,
		CancelToken: uuid.New().String(),
	}

	if err := s.db.WithContext(ctx).Create(job).Error; err != nil {
		return nil, fmt.Errorf("failed to create job: %w", err)
	}

	slog.InfoContext(ctx, "Job created",
		slog.String("jobId", job.ID),
		slog.String("jobType", string(jobType)),
		slog.String("userId", user.ID),
		slog.String("username", user.Username))

	return job, nil
}

// StartJob starts a job asynchronously
func (s *JobService) StartJob(job *models.Job) error {
	s.mu.RLock()
	executor, exists := s.executors[job.Type]
	s.mu.RUnlock()

	if !exists {
		return fmt.Errorf("no executor registered for job type: %s", job.Type)
	}

	// Create cancellable context for this job
	ctx, cancel := context.WithCancel(context.Background())
	s.cancels.Store(job.ID, cancel)

	// Start job execution in goroutine
	go func() {
		defer cancel()
		defer s.cancels.Delete(job.ID)

		s.executeJob(ctx, job, executor)
	}()

	return nil
}

// executeJob runs the job executor and updates job status
func (s *JobService) executeJob(ctx context.Context, job *models.Job, executor JobExecutor) {
	// Update job to running
	startTime := time.Now()
	if err := s.UpdateJobStatus(context.Background(), job.ID, models.JobStatusRunning, 0, "Starting job execution"); err != nil {
		slog.ErrorContext(ctx, "Failed to update job status to running",
			slog.String("jobId", job.ID),
			slog.String("error", err.Error()))
		return
	}

	if err := s.db.WithContext(context.Background()).Model(&models.Job{}).
		Where("id = ?", job.ID).
		Update("start_time", startTime).Error; err != nil {
		slog.WarnContext(ctx, "Failed to update job start time",
			slog.String("jobId", job.ID),
			slog.String("error", err.Error()))
	}

	// Progress update callback
	updateProgress := func(progress int, message string) {
		if err := s.UpdateJobStatus(context.Background(), job.ID, models.JobStatusRunning, progress, message); err != nil {
			slog.WarnContext(ctx, "Failed to update job progress",
				slog.String("jobId", job.ID),
				slog.Int("progress", progress),
				slog.String("error", err.Error()))
		}
	}

	// Execute the job
	err := executor(ctx, job, updateProgress)

	// Update final status
	endTime := time.Now()
	duration := endTime.Sub(startTime)

	if ctx.Err() == context.Canceled {
		// Job was cancelled
		s.UpdateJobStatus(context.Background(), job.ID, models.JobStatusCancelled, 0, "Job cancelled by user")
		slog.InfoContext(ctx, "Job cancelled",
			slog.String("jobId", job.ID),
			slog.Duration("duration", duration))
	} else if err != nil {
		// Job failed
		errMsg := err.Error()
		if updateErr := s.db.WithContext(context.Background()).Model(&models.Job{}).
			Where("id = ?", job.ID).
			Updates(map[string]interface{}{
				"status":   models.JobStatusFailed,
				"error":    errMsg,
				"end_time": endTime,
			}).Error; updateErr != nil {
			slog.ErrorContext(ctx, "Failed to update job to failed status",
				slog.String("jobId", job.ID),
				slog.String("error", updateErr.Error()))
		}
		slog.ErrorContext(ctx, "Job failed",
			slog.String("jobId", job.ID),
			slog.String("error", err.Error()),
			slog.Duration("duration", duration))
	} else {
		// Job completed successfully
		if updateErr := s.db.WithContext(context.Background()).Model(&models.Job{}).
			Where("id = ?", job.ID).
			Updates(map[string]interface{}{
				"status":   models.JobStatusCompleted,
				"progress": 100,
				"message":  "Job completed successfully",
				"end_time": endTime,
			}).Error; updateErr != nil {
			slog.ErrorContext(ctx, "Failed to update job to completed status",
				slog.String("jobId", job.ID),
				slog.String("error", updateErr.Error()))
		}
		slog.InfoContext(ctx, "Job completed",
			slog.String("jobId", job.ID),
			slog.Duration("duration", duration))
	}
}

// UpdateJobStatus updates the job status, progress, and message
func (s *JobService) UpdateJobStatus(ctx context.Context, jobID string, status models.JobStatus, progress int, message string) error {
	updates := map[string]interface{}{
		"status":  status,
		"message": message,
	}

	if progress >= 0 && progress <= 100 {
		updates["progress"] = progress
	}

	if err := s.db.WithContext(ctx).Model(&models.Job{}).
		Where("id = ?", jobID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	return nil
}

// UpdateJobResult updates the job result data
func (s *JobService) UpdateJobResult(ctx context.Context, jobID string, result models.JSON) error {
	if err := s.db.WithContext(ctx).Model(&models.Job{}).
		Where("id = ?", jobID).
		Update("result", result).Error; err != nil {
		return fmt.Errorf("failed to update job result: %w", err)
	}
	return nil
}

// GetJob retrieves a job by ID
func (s *JobService) GetJob(ctx context.Context, jobID string) (*models.Job, error) {
	var job models.Job
	if err := s.db.WithContext(ctx).Where("id = ?", jobID).First(&job).Error; err != nil {
		return nil, fmt.Errorf("failed to get job: %w", err)
	}
	return &job, nil
}

// ListJobs lists jobs with pagination and filtering
func (s *JobService) ListJobs(ctx context.Context, userID string, status models.JobStatus, limit, offset int) ([]models.Job, int64, error) {
	var jobs []models.Job
	var total int64

	query := s.db.WithContext(ctx).Model(&models.Job{})

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count jobs: %w", err)
	}

	if err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&jobs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list jobs: %w", err)
	}

	return jobs, total, nil
}

// CancelJob cancels a running job
func (s *JobService) CancelJob(ctx context.Context, jobID string, userID string) error {
	// Get the job
	var job models.Job
	if err := s.db.WithContext(ctx).Where("id = ? AND user_id = ?", jobID, userID).First(&job).Error; err != nil {
		return fmt.Errorf("failed to get job: %w", err)
	}

	// Check if job can be cancelled
	if job.Status != models.JobStatusPending && job.Status != models.JobStatusRunning {
		return fmt.Errorf("job cannot be cancelled in status: %s", job.Status)
	}

	// Update status to cancelling
	if err := s.UpdateJobStatus(ctx, jobID, models.JobStatusCancelling, 0, "Cancellation requested"); err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	// Cancel the context if job is running
	if cancel, ok := s.cancels.Load(jobID); ok {
		if cancelFunc, ok := cancel.(context.CancelFunc); ok {
			cancelFunc()
		}
	}

	slog.InfoContext(ctx, "Job cancellation requested",
		slog.String("jobId", jobID),
		slog.String("userId", userID))

	return nil
}

// CleanupOldJobs removes completed/failed jobs older than the specified duration
func (s *JobService) CleanupOldJobs(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoffTime := time.Now().Add(-olderThan)

	result := s.db.WithContext(ctx).
		Where("status IN (?, ?, ?) AND created_at < ?",
			models.JobStatusCompleted,
			models.JobStatusFailed,
			models.JobStatusCancelled,
			cutoffTime).
		Delete(&models.Job{})

	if result.Error != nil {
		return 0, fmt.Errorf("failed to cleanup old jobs: %w", result.Error)
	}

	if result.RowsAffected > 0 {
		slog.InfoContext(ctx, "Cleaned up old jobs",
			slog.Int64("deletedCount", result.RowsAffected),
			slog.Duration("olderThan", olderThan))
	}

	return result.RowsAffected, nil
}

// GetJobStats returns statistics about jobs
func (s *JobService) GetJobStats(ctx context.Context, userID string) (map[string]interface{}, error) {
	query := s.db.WithContext(ctx).Model(&models.Job{})
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// Count by status
	var results []struct {
		Status models.JobStatus
		Count  int64
	}

	if err := query.Select("status, COUNT(*) as count").
		Group("status").
		Find(&results).Error; err != nil {
		return nil, fmt.Errorf("failed to get job stats: %w", err)
	}

	// Initialize stats with zero values for all statuses
	stats := map[string]interface{}{
		"pending":   int64(0),
		"running":   int64(0),
		"completed": int64(0),
		"failed":    int64(0),
		"cancelled": int64(0),
		"total":     int64(0),
	}

	var total int64
	for _, r := range results {
		stats[string(r.Status)] = r.Count
		total += r.Count
	}
	stats["total"] = total

	return stats, nil
}

// CreateImagePullExecutor creates a job executor for image pull operations
func CreateImagePullExecutor(imageService *ImageService) JobExecutor {
	return func(ctx context.Context, job *models.Job, updateProgress func(progress int, message string)) error {
		// Extract metadata
		imageName, ok := job.Metadata["imageName"].(string)
		if !ok {
			return fmt.Errorf("invalid job metadata: imageName not found")
		}

		updateProgress(0, fmt.Sprintf("Pulling image: %s", imageName))

		// Create a user struct with minimal info for the pull operation
		user := models.User{
			BaseModel: models.BaseModel{ID: job.UserID},
			Username:  job.Username,
		}

		// Use a no-op writer since we don't display progress bars
		writer := utils.NewNoOpWriter()

		// Pull the image
		if err := imageService.PullImage(ctx, imageName, writer, user, nil); err != nil {
			return fmt.Errorf("failed to pull image: %w", err)
		}

		updateProgress(0, "Image pulled successfully")
		return nil
	}
}
