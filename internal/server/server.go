// Package server wires configuration, routes and middleware into an
// *http.Server.
package server

import (
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/Mayn18/mayn-s-world/internal/config"
	"github.com/Mayn18/mayn-s-world/internal/handlers"
)

// New returns a configured server. The caller starts it with ListenAndServe and
// stops it with Shutdown (see cmd/server/main.go). db is the database the health
// check pings; pass a nil interface when no database is configured.
func New(cfg config.Config, db handlers.Pinger, logger *slog.Logger) *http.Server {
	return &http.Server{
		Addr:    cfg.Addr(),
		Handler: NewHandler(os.DirFS(cfg.StaticDir), db, logger),

		// Without timeouts a slow or stalled client can hold a connection
		// open forever. These are generous for a small site.
		ReadHeaderTimeout: 5 * time.Second,  // time to send the request headers
		ReadTimeout:       10 * time.Second, // time to send the whole request
		WriteTimeout:      15 * time.Second, // time to produce and send the response
		IdleTimeout:       60 * time.Second, // keep-alive connections waiting for a next request

		// Route net/http's internal errors through our logger.
		ErrorLog: slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}
}

// NewHandler builds the router. It takes the static files as an fs.FS rather
// than a directory path so tests can use an in-memory filesystem; likewise the
// database arrives as a handlers.Pinger so tests can use a fake.
func NewHandler(static fs.FS, db handlers.Pinger, logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()

	// Go 1.22+ patterns may start with a method. "GET /api/health" also matches
	// HEAD. A more specific pattern always wins over a general one, so:
	//   GET  /api/health -> Health
	//   POST /api/health -> 405 (the method-less pattern below)
	//   /api/anything    -> JSON 404 (the "/api/" subtree pattern)
	mux.HandleFunc("GET /api/health", handlers.Health(db, logger))
	mux.HandleFunc("/api/health", handlers.MethodNotAllowed("GET, HEAD"))
	mux.HandleFunc("/api", handlers.APINotFound)
	mux.HandleFunc("/api/", handlers.APINotFound)

	// Everything else belongs to the frontend. During backend-only development
	// the React build may not exist yet; the API still works in that case.
	if _, err := fs.Stat(static, "index.html"); err != nil {
		logger.Warn("no frontend build found; serving the API only (run `npm run build` to create it)")
		mux.Handle("/", http.NotFoundHandler())
	} else {
		mux.Handle("/", handlers.SPA(static))
	}

	// Outermost first: logging wraps recovery, so a recovered panic is logged
	// as the 500 the client actually received.
	return logRequests(logger, recoverPanics(logger, mux))
}
