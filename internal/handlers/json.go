// Package handlers contains the HTTP handlers. A handler is any function with
// the signature func(http.ResponseWriter, *http.Request): it reads the request
// and writes the response.
package handlers

import (
	"encoding/json"
	"net/http"
)

type errorBody struct {
	Error string `json:"error"`
}

// writeJSON sends v as a JSON response with the given status.
//
// The value is encoded before anything is written. If encoding fails we can
// still send a clean 500; once WriteHeader has been called, the status line is
// gone and a half-written body cannot be taken back.
func writeJSON(w http.ResponseWriter, status int, v any) {
	body, err := json.Marshal(v)
	if err != nil {
		status = http.StatusInternalServerError
		body = []byte(`{"error":"internal_error"}`)
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	// Stops browsers from second-guessing the declared content type.
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_, _ = w.Write(body) // a write error means the client left; nothing useful to do
}

// WriteError sends {"error": code} with the given status. Codes are short
// machine-readable strings such as "not_found".
func WriteError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, errorBody{Error: code})
}
