// Arcane Docker Bake Configuration
// Copyright © 2025 OFKM Technologies
//
// This file provides standardized build targets for Arcane including
// development, testing, and production releases with multi-platform support.

variable "GO_VERSION" {
  default = "1.25"
}

variable "NODE_VERSION" {
  default = "24"
}

variable "VERSION" {
  default = null
}

variable "REVISION" {
  default = null
}

variable "BUILD_TAGS" {
  default = ""
}

variable "REGISTRY" {
  default = "ghcr.io"
}

variable "IMAGE_NAME" {
  default = "ofkm/arcane"
}

variable "DESTDIR" {
  default = ""
}

function "outdir" {
  params = [defaultdir]
  result = DESTDIR != "" ? DESTDIR : "${defaultdir}"
}

function "tag" {
  params = [suffix]
  result = VERSION != null ? "${REGISTRY}/${IMAGE_NAME}:${VERSION}${suffix}" : "${REGISTRY}/${IMAGE_NAME}:latest${suffix}"
}

// Special target for metadata action integration
target "meta-helper" {}

target "_common" {
  dockerfile = "docker/Dockerfile"
  args = {
    BUILD_TAGS = BUILD_TAGS
  }
  labels = {
    "org.opencontainers.image.source" = "https://github.com/ofkm/arcane"
    "org.opencontainers.image.licenses" = "BSD-3-Clause"
    "org.opencontainers.image.title" = "Arcane"
    "org.opencontainers.image.description" = "Modern Docker Management, Made for Everyone"
  }
}

group "default" {
  targets = ["image"]
}

group "validate" {
  targets = ["lint-backend", "test-backend"]
}

group "release" {
  targets = ["binary-cross", "image-multi"]
}

group "all" {
  targets = ["validate", "release"]
}

target "lint-backend" {
  context = "./backend"
  dockerfile = "Dockerfile.lint"
  target = "lint"
  output = ["type=cacheonly"]
}

target "test-backend" {
  context = "./backend"
  dockerfile = "Dockerfile.test"
  target = "coverage"
  output = [outdir("./backend/.coverage")]
}

target "test-e2e" {
  context = "./tests"
  dockerfile = "Dockerfile.test"
  target = "test"
  output = ["type=cacheonly"]
  allow = ["security.insecure"]
}

target "binary" {
  inherits = ["_common"]
  target = "backend-builder"
  output = [outdir("./backend/.bin")]
  platforms = ["local"]
}

target "binary-cross" {
  inherits = ["binary"]
  platforms = [
    "linux/amd64",
    "linux/arm64",
    "linux/arm/v7",
    "darwin/amd64",
    "darwin/arm64",
  ]
  output = [outdir("./backend/.bin")]
}

target "binary-agent" {
  inherits = ["binary"]
  dockerfile = "docker/Dockerfile-agent"
  args = {
    BUILD_TAGS = "exclude_frontend"
  }
}

target "binary-agent-cross" {
  inherits = ["binary-agent"]
  platforms = [
    "linux/amd64",
    "linux/arm64",
    "linux/arm/v7",
    "darwin/amd64",
    "darwin/arm64",
  ]
  output = [outdir("./backend/.bin")]
}

target "image" {
  inherits = ["_common"]
  tags = [tag("")]
  output = ["type=docker"]
  platforms = ["local"]
}

target "image-multi" {
  inherits = ["image"]
  platforms = [
    "linux/amd64",
    "linux/arm64",
    "linux/arm/v7",
  ]
  output = ["type=image"]
}

target "image-load" {
  inherits = ["image-multi"]
  output = ["type=docker"]
}

target "image-push" {
  inherits = ["image-multi"]
  output = ["type=registry"]
}

target "image-agent" {
  inherits = ["_common"]
  dockerfile = "docker/Dockerfile-agent"
  tags = [tag("-agent")]
  args = {
    BUILD_TAGS = "exclude_frontend"
  }
  output = ["type=docker"]
  platforms = ["local"]
}

target "image-agent-multi" {
  inherits = ["image-agent"]
  platforms = [
    "linux/amd64",
    "linux/arm64",
    "linux/arm/v7",
  ]
  output = ["type=image"]
}

target "image-agent-push" {
  inherits = ["image-agent-multi"]
  output = ["type=registry"]
}

target "image-static" {
  inherits = ["_common"]
  dockerfile = "docker/Dockerfile-static"
  tags = [tag("-static")]
  output = ["type=docker"]
  platforms = ["local"]
}

target "image-static-multi" {
  inherits = ["image-static"]
  platforms = [
    "linux/amd64",
    "linux/arm64",
  ]
  output = ["type=image"]
}

target "image-agent-static" {
  inherits = ["_common"]
  dockerfile = "docker/Dockerfile-agent-static"
  tags = [tag("-agent-static")]
  args = {
    BUILD_TAGS = "exclude_frontend"
  }
  output = ["type=docker"]
  platforms = ["local"]
}

target "image-agent-static-multi" {
  inherits = ["image-agent-static"]
  platforms = [
    "linux/amd64",
    "linux/arm64",
  ]
  output = ["type=image"]
}

target "dev" {
  inherits = ["_common"]
  dockerfile = "docker/Dockerfile.dev"
  tags = ["arcane:dev"]
  output = ["type=docker"]
  cache-from = ["type=local,src=/tmp/.buildx-cache"]
  cache-to = ["type=local,dest=/tmp/.buildx-cache,mode=max"]
}

group "release-all" {
  targets = ["release-standard", "release-agent", "release-static", "release-agent-static"]
}

target "release-standard" {
  inherits = ["image-multi"]
  tags = [
    tag(""),
    "${REGISTRY}/${IMAGE_NAME}:latest"
  ]
  output = ["type=registry"]
  attest = [
    "type=provenance,mode=max",
    "type=sbom"
  ]
}

target "release-agent" {
  inherits = ["image-agent-multi"]
  tags = [tag("-agent")]
  output = ["type=registry"]
  attest = [
    "type=provenance,mode=max",
    "type=sbom"
  ]
}

target "release-static" {
  inherits = ["image-static-multi"]
  tags = [tag("-static")]
  output = ["type=registry"]
  attest = [
    "type=provenance,mode=max",
    "type=sbom"
  ]
}

target "release-agent-static" {
  inherits = ["image-agent-static-multi"]
  tags = [tag("-agent-static")]
  output = ["type=registry"]
  attest = [
    "type=provenance,mode=max",
    "type=sbom"
  ]
}
