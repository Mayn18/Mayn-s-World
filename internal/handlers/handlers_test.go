package handlers

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
	"time"
)

func do(h http.Handler, method, target string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, target, nil))
	return rec
}

func quietLogger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

// fakePinger stands in for the database pool, so these tests need no database.
type fakePinger struct {
	err error
	// block makes Ping wait until its context ends, like a database that
	// accepts the connection but never answers.
	block bool

	// Recorded from the context Ping receives.
	deadline    time.Time
	hadDeadline bool
}

func (f *fakePinger) Ping(ctx context.Context) error {
	f.deadline, f.hadDeadline = ctx.Deadline()
	if f.block {
		<-ctx.Done()
		return ctx.Err()
	}
	return f.err
}

func TestHealthWithoutDatabase(t *testing.T) {
	rec := do(Health(nil, quietLogger()), http.MethodGet, "/api/health")

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	// Exact string, not a parsed comparison: this pins the contract byte for byte.
	if got := rec.Body.String(); got != `{"status":"ok"}` {
		t.Errorf("body = %q, want %q", got, `{"status":"ok"}`)
	}
}

func TestHealthDatabaseUp(t *testing.T) {
	rec := do(Health(&fakePinger{}, quietLogger()), http.MethodGet, "/api/health")

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	if got := rec.Body.String(); got != `{"status":"ok","database":"ok"}` {
		t.Errorf("body = %q", got)
	}
}

func TestHealthDatabaseDownReturns503WithoutLeakingDetails(t *testing.T) {
	// An error shaped like a real driver error: it names a host and a password.
	// None of it may reach the client.
	cause := errors.New("dial tcp db.internal.example:5432: password authentication failed (password=hunter2)")
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))

	rec := do(Health(&fakePinger{err: cause}, logger), http.MethodGet, "/api/health")

	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want 503", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	want := `{"status":"unavailable","database":"unavailable"}`
	if got := rec.Body.String(); got != want {
		t.Errorf("body = %q, want %q", got, want)
	}
	for _, leaked := range []string{"hunter2", "db.internal", "dial tcp", "password"} {
		if strings.Contains(rec.Body.String(), leaked) {
			t.Errorf("response leaks %q: %s", leaked, rec.Body.String())
		}
	}
	// The operator still needs the reason, so it must be in the server log.
	if !strings.Contains(logs.String(), "database ping failed") {
		t.Errorf("expected the failure to be logged, got %q", logs.String())
	}
}

func TestHealthPingIsBounded(t *testing.T) {
	p := &fakePinger{}

	do(Health(p, quietLogger()), http.MethodGet, "/api/health")

	if !p.hadDeadline {
		t.Fatal("Ping got a context with no deadline: a stuck database would hang the request")
	}
	if remaining := time.Until(p.deadline); remaining <= 0 || remaining > pingTimeout {
		t.Errorf("deadline is %v away, want within (0, %v]", remaining, pingTimeout)
	}
}

func TestHealthDatabaseThatNeverAnswersReturns503(t *testing.T) {
	// The request itself carries a short deadline so the test stays fast. The
	// handler must honour it (it keeps the earlier of the two deadlines).
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	start := time.Now()
	Health(&fakePinger{block: true}, quietLogger()).ServeHTTP(rec, req)

	if elapsed := time.Since(start); elapsed > time.Second {
		t.Errorf("handler took %v; it must give up when the context ends", elapsed)
	}
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want 503", rec.Code)
	}
}

func TestAPINotFound(t *testing.T) {
	rec := do(http.HandlerFunc(APINotFound), http.MethodGet, "/api/nope")

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	if got := rec.Body.String(); got != `{"error":"not_found"}` {
		t.Errorf("body = %q", got)
	}
}

func TestMethodNotAllowed(t *testing.T) {
	rec := do(MethodNotAllowed("GET, HEAD"), http.MethodPost, "/api/health")

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", rec.Code)
	}
	if got := rec.Header().Get("Allow"); got != "GET, HEAD" {
		t.Errorf("Allow = %q, want %q", got, "GET, HEAD")
	}
	if got := rec.Body.String(); got != `{"error":"method_not_allowed"}` {
		t.Errorf("body = %q", got)
	}
}

func testSite() fstest.MapFS {
	return fstest.MapFS{
		"index.html":      {Data: []byte("<!doctype html><title>app</title>")},
		"assets/app.js":   {Data: []byte("console.log('app')")},
		"assets/app.css":  {Data: []byte("body{}")},
		"favicon.svg":     {Data: []byte("<svg/>")},
		"assets/nested/x": {Data: []byte("x")},
	}
}

func TestSPA(t *testing.T) {
	h := SPA(testSite())

	tests := []struct {
		name       string
		target     string
		wantStatus int
		wantBody   string // substring; empty means "not checked"
		wantHTML   bool   // whether the response must be the index page
	}{
		{"root serves index", "/", 200, "<title>app</title>", true},
		{"app route falls back to index", "/projects/3", 200, "<title>app</title>", true},
		{"route with trailing slash", "/about/", 200, "<title>app</title>", true},
		{"existing script served as itself", "/assets/app.js", 200, "console.log", false},
		{"existing css served as itself", "/assets/app.css", 200, "body{}", false},
		{"root-level file served", "/favicon.svg", 200, "<svg/>", false},
		{"missing script is 404, not HTML", "/assets/missing.js", 404, "", false},
		{"missing image is 404, not HTML", "/missing.png", 404, "", false},
		{"missing file in a real folder is 404", "/assets/nested/y.map", 404, "", false},
		{"directory falls back to index", "/assets", 200, "<title>app</title>", true},
		// net/http refuses any path containing ".." (400). The router never lets
		// such a path through in production; see the server tests.
		{"traversal is refused", "/../../etc/passwd", 400, "", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(h, http.MethodGet, tc.target)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tc.wantStatus)
			}
			body := rec.Body.String()
			if tc.wantBody != "" && !strings.Contains(body, tc.wantBody) {
				t.Errorf("body = %q, want it to contain %q", body, tc.wantBody)
			}
			if !tc.wantHTML && strings.Contains(body, "<title>app</title>") {
				t.Errorf("response must not be the SPA index page, got %q", body)
			}
		})
	}
}

func TestSPAIndexIsNotCached(t *testing.T) {
	rec := do(SPA(testSite()), http.MethodGet, "/")
	if got := rec.Header().Get("Cache-Control"); got != "no-cache" {
		t.Errorf("Cache-Control = %q, want no-cache", got)
	}
}

func TestSPARejectsWrites(t *testing.T) {
	rec := do(SPA(testSite()), http.MethodPost, "/")
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", rec.Code)
	}
}
