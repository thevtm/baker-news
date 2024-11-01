package htmx

import "net/http"

type HTMXHeaders struct {
	HX_Request string
	HX_Target  string
}

func NewHTMXHeaders(header http.Header) HTMXHeaders {
	return HTMXHeaders{
		HX_Request: header.Get("HX-Request"),
		HX_Target:  header.Get("HX-Target"),
	}
}

func (h *HTMXHeaders) IsHTMXRequest() bool {
	return h.HX_Request == "true"
}
