package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// Pinger is the one thing the health check needs from a database: a way to ask
// "are you there?". *pgxpool.Pool has exactly this method, so the real pool
// satisfies the interface without any glue code, and tests pass a fake instead
// of needing a running PostgreSQL.
type Pinger interface {
	Ping(ctx context.Context) error
}

// pingTimeout bounds how long a health request may wait for the database. A
// health check that hangs is worse than one that fails: load balancers and
// monitors treat a slow answer as an outage anyway, and hung requests pile up.
const pingTimeout = 2 * time.Second

// healthResponse is the contract for GET /api/health. The frontend declares the
// same shape in src/client/api/health.ts; the tests on both sides pin it.
//
// Database is omitted when no database is configured, so that case keeps the
// original {"status":"ok"} body byte for byte.
type healthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database,omitempty"`
}

// Health reports whether the server, and its database if one is configured,
// can serve requests.
//
//	no database configured: 200 {"status":"ok"}
//	database answers:       200 {"status":"ok","database":"ok"}
//	database does not:      503 {"status":"unavailable","database":"unavailable"}
//
// db must be a nil interface (not a nil *pgxpool.Pool stored in an interface)
// when there is no database; see cmd/server/main.go.
//
// The client only ever sees those fixed words. The real error can contain host
// names and other internals, so it goes to the server log, never the response.
func Health(db Pinger, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if db == nil {
			writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
			return
		}

		// Derived from the request context, so the ping also stops early if the
		// client disconnects. WithTimeout keeps the earlier of the two deadlines.
		ctx, cancel := context.WithTimeout(r.Context(), pingTimeout)
		defer cancel()

		if err := db.Ping(ctx); err != nil {
			logger.Warn("health check: database ping failed", "error", err)
			writeJSON(w, http.StatusServiceUnavailable, healthResponse{Status: "unavailable", Database: "unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, healthResponse{Status: "ok", Database: "ok"})
	}
}

// APINotFound answers any /api/* path that has no route, with JSON instead of
// the frontend's HTML page.
func APINotFound(w http.ResponseWriter, r *http.Request) {
	WriteError(w, http.StatusNotFound, "not_found")
}

// MethodNotAllowed returns a handler for a path that exists but not for the
// request's method. allow lists the accepted methods, as the HTTP spec requires.
func MethodNotAllowed(allow string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Allow", allow)
		WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed")
	}
}
