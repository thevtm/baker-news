package htmx

import (
	"fmt"
	"net/http"
)

func HTMXLocation(w http.ResponseWriter, path string, target string) {
	w.Header().Set("HX-Location", fmt.Sprintf(`{"path": "%s","target": "%s"}`, path, target))
}
