package server

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/Mayn18/mayn-s-world/internal/config"
)

func quietLogger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

func site() fstest.MapFS {
	return fstest.MapFS{
		"index.html":    {Data: []byte("<!doctype html><title>app</title>")},
		"assets/app.js": {Data: []byte("console.log('app')")},
	}
}

func get(h http.Handler, method, target string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, target, nil))
	return rec
}

func assertJSON(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantBody string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Errorf("status = %d, want %d", rec.Code, wantStatus)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("body = %q, want %q", got, wantBody)
	}
}

func TestRoutes(t *testing.T) {
	h := NewHandler(site(), quietLogger())

	t.Run("health", func(t *testing.T) {
		assertJSON(t, get(h, "GET", "/api/health"), 200, `{"status":"ok"}`)
	})
	t.Run("health via HEAD", func(t *testing.T) {
		if rec := get(h, "HEAD", "/api/health"); rec.Code != 200 {
			t.Errorf("status = %d, want 200", rec.Code)
		}
	})
	t.Run("POST to health is a JSON 405", func(t *testing.T) {
		rec := get(h, "POST", "/api/health")
		assertJSON(t, rec, 405, `{"error":"method_not_allowed"}`)
		if got := rec.Header().Get("Allow"); got != "GET, HEAD" {
			t.Errorf("Allow = %q", got)
		}
	})
	for _, target := range []string{"/api", "/api/", "/api/nope", "/api/health/extra", "/api/a/b/c"} {
		t.Run("unknown API route "+target, func(t *testing.T) {
			assertJSON(t, get(h, "GET", target), 404, `{"error":"not_found"}`)
		})
	}
	t.Run("unknown API route with POST", func(t *testing.T) {
		assertJSON(t, get(h, "POST", "/api/nope"), 404, `{"error":"not_found"}`)
	})
}

func TestFrontendServing(t *testing.T) {
	h := NewHandler(site(), quietLogger())

	if rec := get(h, "GET", "/"); rec.Code != 200 || !strings.Contains(rec.Body.String(), "<title>app</title>") {
		t.Errorf("/ : status %d body %q", rec.Code, rec.Body.String())
	}
	if rec := get(h, "GET", "/projects/3"); rec.Code != 200 || !strings.Contains(rec.Body.String(), "<title>app</title>") {
		t.Errorf("SPA route: status %d body %q", rec.Code, rec.Body.String())
	}
	if rec := get(h, "GET", "/assets/app.js"); rec.Code != 200 || strings.Contains(rec.Body.String(), "<title>") {
		t.Errorf("asset: status %d body %q", rec.Code, rec.Body.String())
	}
	rec := get(h, "GET", "/assets/gone.js")
	if rec.Code != 404 || strings.Contains(rec.Body.String(), "<title>") {
		t.Errorf("missing asset: status %d body %q, want 404 and no HTML", rec.Code, rec.Body.String())
	}
}

func TestRouterRedirectsUncleanPaths(t *testing.T) {
	h := NewHandler(site(), quietLogger())
	rec := get(h, "GET", "/assets/../../etc/passwd")
	if rec.Code != http.StatusMovedPermanently {
		t.Fatalf("status = %d, want 301 to the cleaned path", rec.Code)
	}
	if loc := rec.Header().Get("Location"); strings.Contains(loc, "..") {
		t.Errorf("Location = %q still contains ..", loc)
	}
}

func TestAPIStillWorksWithoutFrontendBuild(t *testing.T) {
	h := NewHandler(fstest.MapFS{}, quietLogger()) // no index.html

	assertJSON(t, get(h, "GET", "/api/health"), 200, `{"status":"ok"}`)
	if rec := get(h, "GET", "/"); rec.Code != 404 {
		t.Errorf("/ without a build: status = %d, want 404", rec.Code)
	}
}

func TestRequestLogging(t *testing.T) {
	var buf bytes.Buffer
	h := NewHandler(site(), slog.New(slog.NewTextHandler(&buf, nil)))

	get(h, "GET", "/api/health?token=supersecret")

	out := buf.String()
	for _, want := range []string{"method=GET", "path=/api/health", "status=200"} {
		if !strings.Contains(out, want) {
			t.Errorf("log %q is missing %q", out, want)
		}
	}
	if strings.Contains(out, "supersecret") || strings.Contains(out, "token") {
		t.Errorf("log must not contain the query string, got %q", out)
	}
}

func TestPanicBecomesJSON500(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&buf, nil))
	boom := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom") })

	rec := get(logRequests(logger, recoverPanics(logger, boom)), "GET", "/")

	assertJSON(t, rec, 500, `{"error":"internal_error"}`)
	if !strings.Contains(buf.String(), "panic in handler") || !strings.Contains(buf.String(), "status=500") {
		t.Errorf("expected the panic and a status=500 request line in the log, got %q", buf.String())
	}
}

func TestPanicAfterResponseStartedDoesNotAppendJSON(t *testing.T) {
	logger := quietLogger()
	partial := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte("partial response"))
		panic("late panic")
	})

	rec := get(recoverPanics(logger, partial), "GET", "/")

	if rec.Code != http.StatusCreated {
		t.Errorf("status = %d, want 201", rec.Code)
	}
	if got := rec.Body.String(); got != "partial response" {
		t.Errorf("body = %q, want only the already-written response", got)
	}
}

func TestNewSetsTimeoutsAndAddress(t *testing.T) {
	srv := New(config.Config{Port: 9999, StaticDir: t.TempDir()}, quietLogger())

	if srv.Addr != "0.0.0.0:9999" {
		t.Errorf("Addr = %q, want 0.0.0.0:9999", srv.Addr)
	}
	for name, d := range map[string]time.Duration{
		"ReadHeaderTimeout": srv.ReadHeaderTimeout,
		"ReadTimeout":       srv.ReadTimeout,
		"WriteTimeout":      srv.WriteTimeout,
		"IdleTimeout":       srv.IdleTimeout,
	} {
		if d <= 0 {
			t.Errorf("%s must be set (got %v)", name, d)
		}
	}
}
