// Package config reads server settings from environment variables, so the same
// binary runs unchanged on a laptop, in a container or on a hosting provider.
package config

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"strconv"
)

const (
	defaultPort      = 8080
	defaultStaticDir = "dist/client"
)

// Config holds every setting the server needs. Further secrets (session key,
// admin password hash) will be added here in later milestones.
type Config struct {
	// Port is the TCP port to listen on (env PORT).
	Port int
	// StaticDir is the folder containing the built React app (env STATIC_DIR).
	// It is resolved against the working directory, so run from the repo root.
	StaticDir string
	// DatabaseURL is the PostgreSQL connection URL (env DATABASE_URL). It
	// contains a password, so treat it as a secret: never log it or put it in
	// an error message. Empty means "no database configured", which keeps
	// frontend-only development and the existing smoke tests working. It becomes
	// required in Phase 2, when the first feature needs the database.
	DatabaseURL string
}

// String hides the database URL so that printing a Config by accident, for
// example with %v or %+v in a log line, cannot leak the password.
func (c Config) String() string {
	db := "<not configured>"
	if c.DatabaseURL != "" {
		db = "<redacted>"
	}
	return fmt.Sprintf("{Port:%d StaticDir:%s DatabaseURL:%s}", c.Port, c.StaticDir, db)
}

// Load builds a Config from the environment. It takes the lookup function as a
// parameter (pass os.Getenv) so tests can supply values without touching the
// real process environment.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{Port: defaultPort, StaticDir: defaultStaticDir}

	if v := getenv("PORT"); v != "" {
		port, err := strconv.Atoi(v)
		if err != nil || port < 1 || port > 65535 {
			return Config{}, fmt.Errorf("invalid PORT %q: must be an integer from 1 to 65535", v)
		}
		cfg.Port = port
	}

	if v := getenv("STATIC_DIR"); v != "" {
		cfg.StaticDir = v
	}

	if v := getenv("DATABASE_URL"); v != "" {
		if err := validateDatabaseURL(v); err != nil {
			return Config{}, err
		}
		cfg.DatabaseURL = v
	}

	return cfg, nil
}

// validateDatabaseURL checks only the shape of the URL. Whether the database is
// reachable is the pool's business (internal/db), not configuration's.
//
// The returned errors are fixed strings on purpose. The error from url.Parse
// quotes the whole input, password included, so it must never be wrapped or
// returned from here.
func validateDatabaseURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return errors.New("invalid DATABASE_URL: not a valid URL (value hidden)")
	}
	if u.Scheme != "postgres" && u.Scheme != "postgresql" {
		return errors.New("invalid DATABASE_URL: scheme must be postgres:// or postgresql://")
	}
	if u.Hostname() == "" {
		return errors.New("invalid DATABASE_URL: a host is required")
	}
	return nil
}

// Addr is the listen address. It always binds 0.0.0.0 (all IPv4 interfaces)
// because hosting platforms and containers require that; only the port varies.
func (c Config) Addr() string {
	return net.JoinHostPort("0.0.0.0", strconv.Itoa(c.Port))
}
