# path: Dockerfile
# 阶段 1: 构建 React 前端
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 阶段 2: 构建 Go 后端
FROM golang:1.23-alpine AS go-builder
WORKDIR /app
RUN apk --no-cache add build-base sqlite-dev
COPY go.mod go.sum ./
ENV GOTOOLCHAIN=auto
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 go build -ldflags="-w -s" -o /ebook-server .

# 阶段 3: 最终镜像
FROM alpine:latest
RUN apk --no-cache add ca-certificates sqlite-libs
WORKDIR /app

COPY --from=go-builder /ebook-server /app/ebook-server
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY Markdown/ ./Markdown/
COPY static/settings.json ./static/settings.json
COPY static/LICENSE.txt ./static/LICENSE.txt

RUN mkdir -p /app/instance /app/log

EXPOSE 10223
VOLUME ["/app/instance", "/app/log"]

CMD ["/app/ebook-server"]
