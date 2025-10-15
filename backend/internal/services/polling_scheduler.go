package services

import (
	"container/heap"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

// PollTask represents a polling task for a project or global polling
type PollTask struct {
	ProjectID       *string
	NextPollTime    time.Time
	PollingInterval time.Duration
	heapIndex       int // used by heap.Interface
}

// pollTaskHeap implements heap.Interface for PollTask
type pollTaskHeap []*PollTask

func (h *pollTaskHeap) Len() int { return len(*h) }

func (h *pollTaskHeap) Less(i, j int) bool {
	return (*h)[i].NextPollTime.Before((*h)[j].NextPollTime)
}

func (h *pollTaskHeap) Swap(i, j int) {
	(*h)[i], (*h)[j] = (*h)[j], (*h)[i]
	(*h)[i].heapIndex = i
	(*h)[j].heapIndex = j
}

func (h *pollTaskHeap) Push(x interface{}) {
	n := len(*h)
	task := x.(*PollTask)
	task.heapIndex = n
	*h = append(*h, task)
}

func (h *pollTaskHeap) Pop() interface{} {
	old := *h
	n := len(old)
	task := old[n-1]
	old[n-1] = nil
	task.heapIndex = -1
	*h = old[0 : n-1]
	return task
}

// PollingScheduler manages polling tasks using a min-heap priority queue
type PollingScheduler struct {
	db       *database.DB
	heap     *pollTaskHeap
	mu       sync.Mutex
	taskMap  map[string]*PollTask // projectID (or "global") -> task
	notifyCh chan struct{}
	ctx      context.Context
	cancelFn context.CancelFunc
}

// NewPollingScheduler creates a new scheduler and loads schedules from the database
func NewPollingScheduler(ctx context.Context, db *database.DB) (*PollingScheduler, error) {
	h := &pollTaskHeap{}
	heap.Init(h)

	schedCtx, cancel := context.WithCancel(ctx)

	scheduler := &PollingScheduler{
		db:       db,
		heap:     h,
		taskMap:  make(map[string]*PollTask),
		notifyCh: make(chan struct{}, 1),
		ctx:      schedCtx,
		cancelFn: cancel,
	}

	// Load existing schedules from database
	if err := scheduler.loadSchedules(ctx); err != nil {
		cancel()
		return nil, fmt.Errorf("failed to load schedules: %w", err)
	}

	return scheduler, nil
}

// loadSchedules loads all schedules from the database and builds the heap
func (s *PollingScheduler) loadSchedules(ctx context.Context) error {
	var schedules []models.PollingSchedule
	if err := s.db.WithContext(ctx).Find(&schedules).Error; err != nil {
		return fmt.Errorf("failed to query schedules: %w", err)
	}

	now := time.Now()
	catchupCount := 0

	for _, sched := range schedules {
		nextPollTime := sched.NextPollTime

		// Catch-up logic: if next poll time is in the past, schedule immediately
		if nextPollTime.Before(now) {
			nextPollTime = now
			catchupCount++
		}

		// Calculate interval (will be refreshed dynamically later)
		interval := 60 * time.Minute // default
		if sched.LastPollTime != nil && !sched.NextPollTime.IsZero() {
			calculatedInterval := sched.NextPollTime.Sub(*sched.LastPollTime)
			if calculatedInterval > 0 {
				interval = calculatedInterval
			}
		}

		task := &PollTask{
			ProjectID:       sched.ProjectID,
			NextPollTime:    nextPollTime,
			PollingInterval: interval,
		}

		heap.Push(s.heap, task)
		key := s.getTaskKey(sched.ProjectID)
		s.taskMap[key] = task
	}

	if catchupCount > 0 {
		slog.InfoContext(ctx, "Polling scheduler loaded schedules with catch-up",
			slog.Int("totalSchedules", len(schedules)),
			slog.Int("catchupSchedules", catchupCount))
	} else {
		slog.InfoContext(ctx, "Polling scheduler loaded schedules",
			slog.Int("totalSchedules", len(schedules)))
	}

	return nil
}

// Schedule adds or updates a task in the heap and persists to database
func (s *PollingScheduler) Schedule(task *PollTask) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := s.getTaskKey(task.ProjectID)

	// Check if task already exists
	if existingTask, exists := s.taskMap[key]; exists {
		// Update existing task
		existingTask.NextPollTime = task.NextPollTime
		existingTask.PollingInterval = task.PollingInterval
		heap.Fix(s.heap, existingTask.heapIndex)
	} else {
		// Add new task
		heap.Push(s.heap, task)
		s.taskMap[key] = task
	}

	// Persist to database
	if err := s.persistTask(s.ctx, task); err != nil {
		return fmt.Errorf("failed to persist task: %w", err)
	}

	// Notify NextTask that a new task may be ready
	s.notify()

	return nil
}

// NextTask blocks until the next task is ready and returns it
func (s *PollingScheduler) NextTask(ctx context.Context) (*PollTask, error) {
	for {
		s.mu.Lock()

		if s.heap.Len() == 0 {
			s.mu.Unlock()
			// No tasks, wait for notification or context cancellation
			select {
			case <-s.notifyCh:
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-s.ctx.Done():
				return nil, s.ctx.Err()
			}
		}

		// Peek at the next task
		nextTask := (*s.heap)[0]
		waitDuration := time.Until(nextTask.NextPollTime)

		if waitDuration <= 0 {
			// Task is ready, pop it
			task := heap.Pop(s.heap).(*PollTask)
			key := s.getTaskKey(task.ProjectID)
			delete(s.taskMap, key)
			s.mu.Unlock()
			return task, nil
		}

		s.mu.Unlock()

		// Wait until the task is ready or we're notified of a change
		timer := time.NewTimer(waitDuration)
		select {
		case <-timer.C:
			// Task is ready, loop will return it
		case <-s.notifyCh:
			timer.Stop()
			// New task may have been scheduled, check again
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-s.ctx.Done():
			timer.Stop()
			return nil, s.ctx.Err()
		}
	}
}

// Reschedule updates a task with a new next poll time and persists to database
func (s *PollingScheduler) Reschedule(task *PollTask) error {
	return s.Schedule(task)
}

// Remove removes a task from the heap and deletes from database
func (s *PollingScheduler) Remove(projectID *string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := s.getTaskKey(projectID)
	task, exists := s.taskMap[key]
	if !exists {
		// Task not in heap, but try to clean up database anyway
		// (in case it was removed from heap but not from DB)
		_ = s.deleteTask(s.ctx, projectID) // Ignore errors, might already be deleted
		return nil
	}

	// Remove from heap
	heap.Remove(s.heap, task.heapIndex)
	delete(s.taskMap, key)

	// Delete from database (ignore errors, might have been CASCADE deleted)
	if err := s.deleteTask(s.ctx, projectID); err != nil {
		slog.WarnContext(s.ctx, "Failed to delete task from database (might already be deleted)",
			slog.Any("projectID", projectID),
			slog.String("error", err.Error()))
	}

	return nil
}

// Shutdown performs final persistence of all heap state
func (s *PollingScheduler) Shutdown(ctx context.Context) error {
	s.cancelFn()

	s.mu.Lock()
	defer s.mu.Unlock()

	slog.InfoContext(ctx, "Shutting down polling scheduler",
		slog.Int("remainingTasks", len(s.taskMap)))

	// Persist all remaining tasks
	for _, task := range s.taskMap {
		if err := s.persistTask(ctx, task); err != nil {
			slog.WarnContext(ctx, "Failed to persist task during shutdown",
				slog.Any("projectID", task.ProjectID),
				slog.String("error", err.Error()))
		}
	}

	return nil
}

// persistTask saves a task to the database
func (s *PollingScheduler) persistTask(ctx context.Context, task *PollTask) error {
	schedule := models.PollingSchedule{
		ProjectID:    task.ProjectID,
		NextPollTime: task.NextPollTime,
	}

	// Try to find existing schedule
	var existing models.PollingSchedule
	result := s.db.WithContext(ctx).Where("project_id IS NULL AND ? IS NULL OR project_id = ?", task.ProjectID, task.ProjectID).First(&existing)

	if result.Error == nil {
		// Update existing
		schedule.BaseModel = existing.BaseModel
		return s.db.WithContext(ctx).Model(&schedule).Updates(map[string]interface{}{
			"next_poll_time": task.NextPollTime,
			"updated_at":     time.Now(),
		}).Error
	}

	// Create new
	return s.db.WithContext(ctx).Create(&schedule).Error
}

// deleteTask removes a task from the database
func (s *PollingScheduler) deleteTask(ctx context.Context, projectID *string) error {
	if projectID == nil {
		return s.db.WithContext(ctx).Where("project_id IS NULL").Delete(&models.PollingSchedule{}).Error
	}
	return s.db.WithContext(ctx).Where("project_id = ?", *projectID).Delete(&models.PollingSchedule{}).Error
}

// UpdateTaskResult updates the last poll time and duration for a task
func (s *PollingScheduler) UpdateTaskResult(ctx context.Context, projectID *string, duration time.Duration, success bool) error {
	now := time.Now()
	durationMs := int(duration.Milliseconds())

	updates := map[string]interface{}{
		"last_poll_time":        now,
		"last_poll_duration_ms": durationMs,
		"updated_at":            now,
	}

	if success {
		updates["consecutive_failures"] = 0
	} else {
		// Increment consecutive failures
		var schedule models.PollingSchedule
		query := s.db.WithContext(ctx)
		if projectID == nil {
			query = query.Where("project_id IS NULL")
		} else {
			query = query.Where("project_id = ?", *projectID)
		}

		if err := query.First(&schedule).Error; err == nil {
			updates["consecutive_failures"] = schedule.ConsecutiveFailures + 1
		}
	}

	query := s.db.WithContext(ctx).Model(&models.PollingSchedule{})
	if projectID == nil {
		query = query.Where("project_id IS NULL")
	} else {
		query = query.Where("project_id = ?", *projectID)
	}

	return query.Updates(updates).Error
}

// CalculateNextPollTime calculates the next poll time with exponential backoff on failures
func (s *PollingScheduler) CalculateNextPollTime(ctx context.Context, projectID *string, baseInterval time.Duration) (time.Time, error) {
	var schedule models.PollingSchedule
	query := s.db.WithContext(ctx)
	if projectID == nil {
		query = query.Where("project_id IS NULL")
	} else {
		query = query.Where("project_id = ?", *projectID)
	}

	err := query.First(&schedule).Error
	if err != nil {
		// No schedule record found (first poll) or query error
		// In either case, use base interval without backoff
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			slog.WarnContext(ctx, "Failed to query schedule for backoff calculation",
				slog.Any("projectID", projectID),
				slog.String("error", err.Error()))
		}
		return time.Now().Add(baseInterval), nil
	}

	if schedule.ConsecutiveFailures == 0 {
		return time.Now().Add(baseInterval), nil
	}

	// Apply exponential backoff: baseInterval * 2^failures
	backoffMultiplier := 1 << uint(schedule.ConsecutiveFailures)
	if schedule.ConsecutiveFailures < 0 {
		backoffMultiplier = 0
	}
	if backoffMultiplier > 1440 { // Cap at 24 hours for hourly interval (1440 minutes)
		backoffMultiplier = 1440
	}

	backoffInterval := baseInterval * time.Duration(backoffMultiplier)
	maxBackoff := 24 * time.Hour
	if backoffInterval > maxBackoff {
		backoffInterval = maxBackoff
	}

	return time.Now().Add(backoffInterval), nil
}

// getTaskKey returns a unique key for a task
func (s *PollingScheduler) getTaskKey(projectID *string) string {
	if projectID == nil {
		return "global"
	}
	return *projectID
}

// Size returns the current number of scheduled tasks
func (s *PollingScheduler) Size() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.taskMap)
}

// notify sends a notification to NextTask
func (s *PollingScheduler) notify() {
	select {
	case s.notifyCh <- struct{}{}:
	default:
		// Channel already has a notification
	}
}
