// path: internal/api/middleware.go
package api

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

func panicRecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("panic recovered",
					slog.Any("error", r),
					slog.String("path", c.FullPath()),
					slog.String("method", c.Request.Method),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "内部服务错误"})
			}
		}()
		c.Next()
	}
}
