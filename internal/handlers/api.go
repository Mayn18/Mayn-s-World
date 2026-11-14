package handlers

import "net/http"

// healthResponse is the contract for GET /api/health. The frontend declares the
// same shape in src/client/api/health.ts; the tests on both sides pin it.
type healthResponse struct {
	Status string `json:"status"`
}

// Health reports that the server is up and able to answer requests.
func Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
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
