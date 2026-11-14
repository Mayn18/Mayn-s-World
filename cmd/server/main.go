// Command server runs the Mayn's World backend: the JSON API under /api and the
// built React app, both from one origin.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Mayn18/mayn-s-world/internal/config"
	"github.com/Mayn18/mayn-s-world/internal/server"
)

// shutdownTimeout is how long in-flight requests get to finish after a stop signal.
const shutdownTimeout = 10 * time.Second

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

// run holds the real logic so it can return errors. main only turns an error
// into an exit code; os.Exit skips deferred functions, so it must not be called
// from deeper code.
func run() error {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))

	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}

	srv := server.New(cfg, logger)

	// ctx is cancelled when the process receives Ctrl+C (SIGINT) or SIGTERM,
	// which is what Docker and hosting platforms send to ask a program to stop.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// ListenAndServe blocks, so it runs in its own goroutine and reports its
	// result on a channel. The buffer of 1 lets that goroutine finish and exit
	// even if nobody is left to receive.
	serveErr := make(chan error, 1)
	go func() {
		logger.Info("server starting", "addr", srv.Addr, "static_dir", cfg.StaticDir)
		serveErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		// ListenAndServe only returns http.ErrServerClosed after Shutdown, and
		// we have not called Shutdown yet, so any error here is a real failure
		// such as "address already in use".
		return fmt.Errorf("server failed: %w", err)
	case <-ctx.Done():
	}

	// Restore default signal handling so a second Ctrl+C kills the process
	// immediately if shutdown hangs.
	stop()
	logger.Info("shutdown signal received; finishing in-flight requests", "timeout", shutdownTimeout)

	// Shutdown stops accepting new connections, then waits for active requests
	// to finish, up to the deadline in shutdownCtx.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}

	logger.Info("server stopped")
	return nil
}
