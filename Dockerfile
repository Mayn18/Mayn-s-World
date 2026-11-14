# Production image for Mayn's World: one Go binary plus the built React app.
#
# Three stages. Only the last one ships, so Node.js, npm, the Go toolchain and
# all source code stay out of the final image:
#   1. web   - Node builds the React app into dist/client.
#   2. build - Go compiles the server into a single static binary.
#   3. final - a minimal image holding just that binary and dist/client.
#
# Build:  docker build -t mayn-s-world .
# Run:    docker run --rm -p 8080:8080 mayn-s-world
#
# Base images are pinned to a major/minor tag, not a digest, for now. Pinning to
# reviewed digests is part of the Phase 9 hardening pass (see ADR-011).

# --- Stage 1: build the React app -------------------------------------------
FROM node:26-alpine AS web
WORKDIR /src

# Copy only the dependency manifests first. Docker caches each step, so this
# lets `npm ci` be skipped on later builds unless a manifest actually changed.
COPY package.json package-lock.json ./
RUN npm ci

# Then the files `vite build` needs. The output lands in dist/client
# (see build.outDir in vite.config.ts).
COPY index.html tsconfig.client.json vite.config.ts ./
COPY src ./src
RUN npm run build

# --- Stage 2: compile the Go server -----------------------------------------
FROM golang:1.27-alpine AS build
WORKDIR /src

# Same caching idea: module files first, so `go mod download` (which fetches
# pgx and its dependencies) is skipped on later builds unless go.mod or go.sum
# changed. The glob keeps the build working if go.sum is ever absent.
COPY go.mod go.sum* ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal

# CGO_ENABLED=0 produces a fully static binary with no C library dependency, so
# it can run in an image that contains no operating system files at all.
# -trimpath removes local file paths from the binary; "-s -w" drops debug
# symbols to make it smaller.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# --- Stage 3: the image that actually ships ---------------------------------
# distroless "static" has no shell, no package manager and no extra tools, which
# keeps it small and leaves little for an attacker to use. The "nonroot" tag
# runs as an unprivileged user (UID 65532) instead of root.
FROM gcr.io/distroless/static-debian12:nonroot

# STATIC_DIR defaults to "dist/client", resolved against the working directory
# (internal/config/config.go), so the layout below must match that.
WORKDIR /app
COPY --from=build /out/server ./server
COPY --from=web /src/dist/client ./dist/client

# The server always binds 0.0.0.0 and reads PORT. Hosting platforms such as
# Render set PORT themselves; 8080 is the default for local runs.
ENV PORT=8080
EXPOSE 8080

# No secrets live in the image. Configuration arrives as environment variables
# at run time.
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
