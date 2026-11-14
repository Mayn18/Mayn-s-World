package handlers

import (
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// SPA serves the built React app from fsys.
//
// A single-page app handles its own routes in the browser, so a request for
// /projects/3 must return index.html and let React draw the page. But a request
// for a missing file such as /assets/app.js must be a real 404: answering it
// with HTML makes the browser try to run HTML as JavaScript and hides the bug.
// The rule: a path that names a file (it has an extension) is a file request;
// any other path is an app route.
func SPA(fsys fs.FS) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Clean resolves "." and ".." against a leading "/", so a request like
		// /../../etc/passwd cannot climb out of fsys. fs.FS also refuses such
		// names on its own; this is the second layer.
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")

		if name != "" {
			if info, err := fs.Stat(fsys, name); err == nil && !info.IsDir() {
				http.ServeFileFS(w, r, fsys, name)
				return
			}
			if path.Ext(name) != "" {
				http.NotFound(w, r)
				return
			}
		}

		// no-cache makes browsers revalidate index.html, so a new deployment is
		// picked up at once. The hashed files under /assets/ are safe to cache.
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFileFS(w, r, fsys, "index.html")
	})
}
