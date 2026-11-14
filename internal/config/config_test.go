package config

import (
	"fmt"
	"strings"
	"testing"
)

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(env(nil))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != 8080 {
		t.Errorf("Port = %d, want 8080", cfg.Port)
	}
	if cfg.StaticDir != "dist/client" {
		t.Errorf("StaticDir = %q, want %q", cfg.StaticDir, "dist/client")
	}
	if got := cfg.Addr(); got != "0.0.0.0:8080" {
		t.Errorf("Addr() = %q, want %q", got, "0.0.0.0:8080")
	}
}

func TestLoadOverrides(t *testing.T) {
	cfg, err := Load(env(map[string]string{"PORT": "9090", "STATIC_DIR": "/srv/web"}))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != 9090 || cfg.StaticDir != "/srv/web" {
		t.Errorf("got %+v, want port 9090 and static dir /srv/web", cfg)
	}
	if got := cfg.Addr(); got != "0.0.0.0:9090" {
		t.Errorf("Addr() = %q, want %q", got, "0.0.0.0:9090")
	}
}

func TestLoadRejectsInvalidPort(t *testing.T) {
	for _, bad := range []string{"abc", "0", "-1", "65536", "80.5", " 80"} {
		if _, err := Load(env(map[string]string{"PORT": bad})); err == nil {
			t.Errorf("PORT=%q: expected an error, got nil", bad)
		}
	}
}

// A password that would be easy to spot if it ever reached an error or a log.
const testSecret = "s3cr3t-p4ssw0rd"

func TestLoadDatabaseURLDefaultsToEmpty(t *testing.T) {
	cfg, err := Load(env(nil))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.DatabaseURL != "" {
		t.Errorf("DatabaseURL = %q, want empty (no database configured)", cfg.DatabaseURL)
	}
}

func TestLoadAcceptsPostgresURLs(t *testing.T) {
	for _, good := range []string{
		"postgres://app:" + testSecret + "@db:5432/mayn?sslmode=disable",
		"postgresql://app:" + testSecret + "@db.example.com/mayn?sslmode=require",
		"postgres://app@localhost/mayn",
	} {
		cfg, err := Load(env(map[string]string{"DATABASE_URL": good}))
		if err != nil {
			t.Errorf("DATABASE_URL=%q: unexpected error %v", good, err)
			continue
		}
		if cfg.DatabaseURL != good {
			t.Errorf("DatabaseURL = %q, want the value unchanged", cfg.DatabaseURL)
		}
	}
}

func TestLoadRejectsInvalidDatabaseURL(t *testing.T) {
	bad := []string{
		"mysql://app:" + testSecret + "@db:3306/mayn",   // wrong scheme
		"http://app:" + testSecret + "@db/mayn",         // wrong scheme
		"app:" + testSecret + "@db/mayn",                // no scheme
		"postgres://app:" + testSecret + "@/mayn",       // no host
		"postgres://app:" + testSecret + "@db:%zz/mayn", // unparseable
	}
	for _, v := range bad {
		_, err := Load(env(map[string]string{"DATABASE_URL": v}))
		if err == nil {
			t.Errorf("DATABASE_URL=%q: expected an error, got nil", v)
			continue
		}
		// The password must never come back out in the error.
		if strings.Contains(err.Error(), testSecret) {
			t.Errorf("error leaks the password: %v", err)
		}
	}
}

func TestConfigStringHidesDatabaseURL(t *testing.T) {
	cfg := Config{Port: 8080, StaticDir: "dist/client", DatabaseURL: "postgres://app:" + testSecret + "@db/mayn"}

	for _, got := range []string{
		cfg.String(),
		fmt.Sprintf("%v", cfg),
		fmt.Sprintf("%+v", cfg),
	} {
		if strings.Contains(got, testSecret) || strings.Contains(got, "postgres://") {
			t.Errorf("formatted config leaks the database URL: %s", got)
		}
	}
}
