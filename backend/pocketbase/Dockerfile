# Compiles PocketBase from source (via the Go module proxy) instead of
# downloading a prebuilt release binary from GitHub Releases. This was a
# deliberate choice, not just a style preference: the sandbox this was
# built in blocks GitHub/Docker Hub asset downloads but allows
# proxy.golang.org, so compiling from source was the only way to actually
# build *and verify* this image's contents here — see README.md. It also
# means this Dockerfile builds correctly on both amd64 and arm64 with no
# extra cross-compilation flags, since `go build` targets the builder
# stage's native platform automatically under Docker's multi-platform
# buildx.
FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 go build -o /pocketbase .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /pb
COPY --from=builder /pocketbase ./pocketbase
COPY pb_migrations ./pb_migrations
COPY pb_hooks ./pb_hooks
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /pb/pocketbase

EXPOSE 8090
VOLUME /pb/pb_data

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["serve", "--http=0.0.0.0:8090"]
