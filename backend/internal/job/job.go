package job

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/go-co-op/gocron/v2"
	"github.com/google/uuid"
)

type Scheduler struct {
	scheduler gocron.Scheduler
}

func NewScheduler() (*Scheduler, error) {
	s, err := gocron.NewScheduler()
	if err != nil {
		return nil, fmt.Errorf("failed to create new gocron scheduler: %w", err)
	}
	return &Scheduler{scheduler: s}, nil
}

func (s *Scheduler) Run(ctx context.Context) error {
	slog.Info("Starting job scheduler")
	s.scheduler.Start() // Start the scheduler, non-blocking

	// Wait for the context to be done (e.g., application shutdown)
	<-ctx.Done()

	slog.Info("Shutting down job scheduler...")
	err := s.scheduler.Shutdown()
	if err != nil {
		slog.Error("Error shutting down job scheduler", slog.Any("error", err))
		return fmt.Errorf("error during scheduler shutdown: %w", err)
	}

	slog.Info("Job scheduler shut down successfully")
	return nil
}

func (s *Scheduler) RegisterJob(
	ctx context.Context,
	name string,
	definition gocron.JobDefinition,
	taskFunc func(ctx context.Context) error,
	runImmediately bool,
) error {
	jobOptions := []gocron.JobOption{
		gocron.WithContext(ctx),
		gocron.WithEventListeners(
			gocron.BeforeJobRuns(func(jobID uuid.UUID, jobName string) {
				slog.Info("Job starting",
					slog.String("name", name),
					slog.String("id", jobID.String()),
				)
			}),
			gocron.AfterJobRuns(func(jobID uuid.UUID, jobName string) {
				slog.Info("Job finished successfully",
					slog.String("name", name),
					slog.String("id", jobID.String()),
				)
			}),
			gocron.AfterJobRunsWithError(func(jobID uuid.UUID, jobName string, err error) {
				slog.Error("Job failed",
					slog.String("name", name),
					slog.String("id", jobID.String()),
					slog.Any("error", err),
				)
			}),
		),
	}

	task := gocron.NewTask(func() {
		if err := taskFunc(ctx); err != nil {
			slog.Error("Error executing task function",
				slog.String("name", name),
				slog.Any("error", err),
			)
		}
	})

	var err error
	if runImmediately {
		_, err = s.scheduler.NewJob(definition, task, append(jobOptions, gocron.WithStartAt(gocron.WithStartImmediately()))...)
	} else {
		_, err = s.scheduler.NewJob(definition, task, jobOptions...)
	}
	if err != nil {
		return fmt.Errorf("failed to register job %q: %w", name, err)
	}

	slog.Info("Job registered successfully", slog.String("name", name))
	return nil
}
