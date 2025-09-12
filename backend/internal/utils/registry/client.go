package registry

import (
	"net/http"
)

// Client provides helper methods for Docker/OCI registries.
type Client struct {
	http *http.Client
}

func NewClient() *Client {
	return &Client{http: &http.Client{}}
}
