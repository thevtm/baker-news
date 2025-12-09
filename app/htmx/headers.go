package htmx

import (
	"net/http"
	"net/url"
)

type HTMXHeadersCurrentURL struct {
	Valid bool
	URL   *url.URL
}

type HTMXHeaders struct {
	HXRequest    bool
	HXTarget     string
	HXCurrentURL HTMXHeadersCurrentURL
}

func ParseHTMXHeaders(header http.Header) HTMXHeaders {
	hx_current_url, err := url.Parse(header.Get("HX-Current-URL"))

	return HTMXHeaders{
		HXRequest:    header.Get("HX-Request") == "true",
		HXTarget:     header.Get("HX-Target"),
		HXCurrentURL: HTMXHeadersCurrentURL{Valid: err == nil, URL: hx_current_url},
	}
}

func (h *HTMXHeaders) IsHTMXRequest() bool {
	return h.HXRequest
}
