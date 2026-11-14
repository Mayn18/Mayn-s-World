package server

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/Mayn18/mayn-s-world/internal/handlers"
)

// statusRecorder remembers the status code a handler wrote, which
// http.ResponseWriter does not let us read back.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// Unwrap lets net/http reach the real writer for features such as flushing.
func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

// logRequests writes one line per request. It logs only the method, path,
// status and duration. Query strings, headers and bodies are left out on
// purpose: they can carry tokens or form contents (see CLAUDE.md, Security).
func logRequests(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rec, r)

		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

// recoverPanics turns a panic inside a handler into a logged JSON 500. Without
// it net/http still survives the panic, but it just drops the connection and
// the client sees a network error instead of a response.
func recoverPanics(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			rec := recover()
			if rec == nil {
				return
			}
			if rec == http.ErrAbortHandler {
				panic(rec) // deliberate abort signal from net/http; pass it on
			}
			logger.Error("panic in handler", "method", r.Method, "path", r.URL.Path, "panic", rec)
			handlers.WriteError(w, http.StatusInternalServerError, "internal_error")
		}()
		next.ServeHTTP(w, r)
	})
}
