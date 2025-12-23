package logger

import (
	"go.uber.org/fx"
	"go.uber.org/zap"

	"worker/internal/config"
)

// Module provides logger dependencies
var Module = fx.Module("logger",
	fx.Provide(NewLogger),
)

// NewLogger creates a new zap logger based on environment
func NewLogger(cfg *config.ServerConfig) (*zap.Logger, error) {
	var logger *zap.Logger
	var err error

	if cfg.Env == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}

	if err != nil {
		return nil, err
	}

	return logger, nil
}
