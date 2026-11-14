// Package db opens the PostgreSQL connection pool. It is the only package that
// imports the pgx driver; the rest of the program sees the pool through small
// interfaces (for example handlers.Pinger), so handlers stay testable without a
// database and the driver choice stays in one place.
package db

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool limits. They are constants, not environment settings, until a real need
// to tune them appears; fewer settings means fewer ways to misconfigure.
const (
	// maxConns caps simultaneous connections. A personal site needs very few,
	// and managed free databases (Neon Free) allow only a limited number in
	// total, so a small cap leaves headroom for migrations and admin tools.
	maxConns = 10

	// maxConnLifetime recycles connections periodically, so a connection that a
	// database restart or a cloud proxy silently dropped is not reused forever.
	maxConnLifetime = 30 * time.Minute

	// maxConnIdleTime closes connections nobody has used for a while. Neon
	// suspends idle databases, so holding idle connections open is pointless.
	maxConnIdleTime = 5 * time.Minute

	// healthCheckPeriod is how often the pool tests its idle connections in the
	// background and replaces broken ones.
	healthCheckPeriod = time.Minute

	// connectTimeout bounds one attempt to open a connection. Without it a
	// black-holed network could leave a caller waiting for the operating
	// system's default timeout, which is minutes.
	connectTimeout = 5 * time.Second
)

// NewPool validates databaseURL and returns a pool configured with the limits
// above.
//
// The pool is lazy: it does not open a connection here (MinConns is 0), only
// when the first query or Ping needs one. So NewPool succeeds while the
// database is still starting or temporarily unreachable, and the health check
// reports that as 503 instead of the whole server failing to start. Only a
// URL that cannot be parsed is an error here.
//
// The caller owns the pool and must call Close, after the HTTP server has
// stopped, so that no request is using it.
//
// Errors are fixed strings on purpose: pgx's parse errors can quote parts of
// the URL, and the URL contains the password.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, errors.New("database: invalid connection settings (value hidden)")
	}

	cfg.MaxConns = maxConns
	cfg.MinConns = 0
	cfg.MaxConnLifetime = maxConnLifetime
	cfg.MaxConnIdleTime = maxConnIdleTime
	cfg.HealthCheckPeriod = healthCheckPeriod
	cfg.ConnConfig.ConnectTimeout = connectTimeout

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, errors.New("database: could not create the connection pool")
	}
	return pool, nil
}
