// Package config reads server settings from environment variables, so the same
// binary runs unchanged on a laptop, in a container or on a hosting provider.
package config

import (
	"fmt"
	"net"
	"strconv"
)

const (
	defaultPort      = 8080
	defaultStaticDir = "dist/client"
)

// Config holds every setting the server needs. Secrets and database settings
// will be added here in later milestones.
type Config struct {
	// Port is the TCP port to listen on (env PORT).
	Port int
	// StaticDir is the folder containing the built React app (env STATIC_DIR).
	// It is resolved against the working directory, so run from the repo root.
	StaticDir string
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

	return cfg, nil
}

// Addr is the listen address. It always binds 0.0.0.0 (all IPv4 interfaces)
// because hosting platforms and containers require that; only the port varies.
func (c Config) Addr() string {
	return net.JoinHostPort("0.0.0.0", strconv.Itoa(c.Port))
}
