package resources

import "embed"

// Embedded file systems for the project

//go:embed migrations images
var FS embed.FS
