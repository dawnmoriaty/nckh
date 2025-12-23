package main

import (
	"go.uber.org/fx"

	grpcadapter "worker/internal/adapter/grpc"
	"worker/internal/adapter/logger"
	"worker/internal/adapter/storage/postgres"
	"worker/internal/config"
	"worker/internal/core/services"
)

func main() {
	fx.New(
		// Infrastructure modules
		config.Module,
		logger.Module,

		// Storage modules (adapters)
		postgres.Module,

		// Core business logic
		services.Module,

		// Transport layer (gRPC)
		grpcadapter.Module,
	).Run()
}
