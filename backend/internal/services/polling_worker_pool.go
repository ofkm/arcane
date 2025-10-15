package services

import (
	"context"
	"log/slog"
	"sync"
)

// PollingWorkerPool manages a pool of workers for executing polling tasks
type PollingWorkerPool struct {
	workerCount int
	taskCh      chan *PollTask
	wg          sync.WaitGroup
	ctx         context.Context
	cancelFn    context.CancelFunc
	executor    TaskExecutor
}

// TaskExecutor is a function that executes a polling task
type TaskExecutor func(ctx context.Context, task *PollTask) error

// NewPollingWorkerPool creates a new worker pool
func NewPollingWorkerPool(workerCount int, executor TaskExecutor) *PollingWorkerPool {
	return &PollingWorkerPool{
		workerCount: workerCount,
		taskCh:      make(chan *PollTask, workerCount*2), // Buffer for smoother operation
		executor:    executor,
	}
}

// Start begins the worker pool with the given number of workers
func (p *PollingWorkerPool) Start(ctx context.Context) {
	p.ctx, p.cancelFn = context.WithCancel(ctx)

	slog.InfoContext(ctx, "Starting polling worker pool",
		slog.Int("workerCount", p.workerCount))

	for i := 0; i < p.workerCount; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

// worker is the main worker goroutine that processes tasks
func (p *PollingWorkerPool) worker(id int) {
	defer p.wg.Done()

	slog.DebugContext(p.ctx, "Worker started",
		slog.Int("workerID", id))

	for {
		select {
		case task, ok := <-p.taskCh:
			if !ok {
				// Channel closed, worker should exit
				slog.DebugContext(p.ctx, "Worker channel closed, exiting",
					slog.Int("workerID", id))
				return
			}

			// Execute the task
			if err := p.executor(p.ctx, task); err != nil {
				slog.ErrorContext(p.ctx, "Worker failed to execute task",
					slog.Int("workerID", id),
					slog.Any("projectID", task.ProjectID),
					slog.String("error", err.Error()))
			} else {
				slog.DebugContext(p.ctx, "Worker completed task",
					slog.Int("workerID", id),
					slog.Any("projectID", task.ProjectID))
			}

		case <-p.ctx.Done():
			slog.DebugContext(p.ctx, "Worker context canceled, exiting",
				slog.Int("workerID", id))
			return
		}
	}
}

// Submit submits a task to the worker pool
func (p *PollingWorkerPool) Submit(task *PollTask) error {
	select {
	case p.taskCh <- task:
		return nil
	case <-p.ctx.Done():
		return p.ctx.Err()
	}
}

// Stop gracefully stops the worker pool
func (p *PollingWorkerPool) Stop(ctx context.Context) error {
	slog.InfoContext(ctx, "Stopping polling worker pool")

	// Cancel context to signal workers
	if p.cancelFn != nil {
		p.cancelFn()
	}

	// Close task channel
	close(p.taskCh)

	// Wait for all workers to finish with timeout
	done := make(chan struct{})
	go func() {
		p.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		slog.InfoContext(ctx, "Polling worker pool stopped gracefully")
		return nil
	case <-ctx.Done():
		slog.WarnContext(ctx, "Polling worker pool stop timed out")
		return ctx.Err()
	}
}

// QueueSize returns the current number of tasks waiting in the queue
func (p *PollingWorkerPool) QueueSize() int {
	return len(p.taskCh)
}
