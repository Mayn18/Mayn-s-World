package config

import "testing"

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
