// path: internal/tools/deps.go
//go:build tools

package tools

import (
    _ "github.com/gin-contrib/cors"
    _ "github.com/gin-gonic/gin"
    _ "github.com/lumberjack/lumberjack"
    _ "github.com/mattn/go-sqlite3"
    _ "github.com/spf13/viper"
)
