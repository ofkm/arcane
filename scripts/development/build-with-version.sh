#!/bin/bash

VERSION=$(cat ../.version 2>/dev/null | sed 's/^\s*\|\s*$//g' || echo "dev") && \
REVISION=$(cat ../.revision 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo "unknown") && \
LDFLAGS="-w -s -X github.com/ofkm/arcane-backend/internal/config.Version=${VERSION} -X github.com/ofkm/arcane-backend/internal/config.Revision=${REVISION}" && \
go build -ldflags="$LDFLAGS" -trimpath -o arcane ./cmd/main.go