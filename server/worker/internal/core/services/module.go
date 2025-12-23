package services

import (
	"go.uber.org/fx"

	"worker/internal/core/ports"
)

// Module provides core business services
var Module = fx.Module("services",
	fx.Provide(
		// Services - core business logic
		fx.Annotate(
			NewAuthService,
			fx.As(new(ports.AuthService)),
		),
	),
)
