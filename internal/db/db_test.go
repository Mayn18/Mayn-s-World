package db

import (
	"context"
	"net"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"
)

// A password that would be easy to spot if it ever reached an error.
const testSecret = "s3cr3t-p4ssw0rd"

// unreachableURL returns a connection URL for a localhost port with nothing
// listening on it, so connecting is refused immediately.
func unreachableURL(t *testing.T) string {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	port := l.Addr().(*net.TCPAddr).Port
	if err := l.Close(); err != nil {
		t.Fatalf("close listener: %v", err)
	}
	return "postgres://app:" + testSecret + "@127.0.0.1:" + strconv.Itoa(port) + "/mayn?sslmode=disable"
}

func TestNewPoolRejectsUnparsableURLWithoutLeakingIt(t *testing.T) {
	// "%zz" is an invalid escape, so the URL cannot be parsed.
	_, err := NewPool(context.Background(), "postgres://app:"+testSecret+"%zz@db/mayn")
	if err == nil {
		t.Fatal("expected an error for an unparsable URL, got nil")
	}
	if strings.Contains(err.Error(), testSecret) {
		t.Errorf("error leaks the password: %v", err)
	}
}

func TestNewPoolAppliesLimits(t *testing.T) {
	// No database is running: the pool must still be created (it is lazy).
	pool, err := NewPool(context.Background(), unreachableURL(t))
	if err != nil {
		t.Fatalf("NewPool() error = %v; the pool must not connect eagerly", err)
	}
	defer pool.Close()

	cfg := pool.Config()
	if cfg.MaxConns != maxConns {
		t.Errorf("MaxConns = %d, want %d", cfg.MaxConns, maxConns)
	}
	if cfg.MinConns != 0 {
		t.Errorf("MinConns = %d, want 0 (a non-zero minimum would connect eagerly)", cfg.MinConns)
	}
	if cfg.MaxConnLifetime != maxConnLifetime {
		t.Errorf("MaxConnLifetime = %v, want %v", cfg.MaxConnLifetime, maxConnLifetime)
	}
	if cfg.MaxConnIdleTime != maxConnIdleTime {
		t.Errorf("MaxConnIdleTime = %v, want %v", cfg.MaxConnIdleTime, maxConnIdleTime)
	}
	if cfg.HealthCheckPeriod != healthCheckPeriod {
		t.Errorf("HealthCheckPeriod = %v, want %v", cfg.HealthCheckPeriod, healthCheckPeriod)
	}
	if cfg.ConnConfig.ConnectTimeout != connectTimeout {
		t.Errorf("ConnectTimeout = %v, want %v", cfg.ConnConfig.ConnectTimeout, connectTimeout)
	}
}

func TestUnreachableDatabaseFailsCleanly(t *testing.T) {
	pool, err := NewPool(context.Background(), unreachableURL(t))
	if err != nil {
		t.Fatalf("NewPool() error = %v", err)
	}
	defer pool.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	start := time.Now()
	err = pool.Ping(ctx)

	if err == nil {
		t.Fatal("Ping() succeeded with nothing listening; want an error")
	}
	if elapsed := time.Since(start); elapsed > 4*time.Second {
		t.Errorf("Ping() took %v; a refused connection must fail fast", elapsed)
	}
	// The health handler logs this error, so it must not contain the password.
	if strings.Contains(err.Error(), testSecret) {
		t.Errorf("connection error leaks the password: %v", err)
	}
}

func TestClosedPoolRefusesWork(t *testing.T) {
	pool, err := NewPool(context.Background(), unreachableURL(t))
	if err != nil {
		t.Fatalf("NewPool() error = %v", err)
	}

	pool.Close()
	pool.Close() // shutdown paths can run twice; that must be harmless

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err == nil {
		t.Error("Ping() on a closed pool succeeded; want an error")
	}
}

// TestRealDatabase needs a running PostgreSQL, so it only runs when
// TEST_DATABASE_URL is set (CI sets it from a postgres:17 service container).
func TestRealDatabase(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL is not set; skipping the test against a real PostgreSQL")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := NewPool(ctx, url)
	if err != nil {
		t.Fatalf("NewPool() error = %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("Ping() error = %v", err)
	}

	var one int
	if err := pool.QueryRow(ctx, "SELECT 1").Scan(&one); err != nil {
		t.Fatalf("SELECT 1: %v", err)
	}
	if one != 1 {
		t.Errorf("SELECT 1 returned %d", one)
	}
}
