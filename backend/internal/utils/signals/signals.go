package signals

import (
	"context"
	"os"
	"os/signal"
	"syscall"
)

func SignalContext(ctx context.Context) context.Context {
	signalCtx, cancel := context.WithCancel(ctx)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		cancel()
	}()

	return signalCtx
}
