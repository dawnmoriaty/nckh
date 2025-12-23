package grpc

import (
	"context"
	"fmt"
	"net"

	"go.uber.org/fx"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"worker/internal/adapter/grpc/handler"
	"worker/internal/config"
	pb "worker/pb"
)

// Module provides gRPC server dependencies
var Module = fx.Module("grpc",
	fx.Provide(
		NewGRPCServer,
		handler.NewAuthHandler,
	),
	fx.Invoke(registerServices),
)

// GRPCServer wraps the gRPC server with its dependencies
type GRPCServer struct {
	Server   *grpc.Server
	Listener net.Listener
}

// NewGRPCServer creates a new gRPC server
func NewGRPCServer(lc fx.Lifecycle, cfg *config.GRPCConfig, serverCfg *config.ServerConfig, logger *zap.Logger) (*GRPCServer, error) {
	server := grpc.NewServer()

	// Enable reflection in development mode
	if serverCfg.Env == "development" {
		reflection.Register(server)
		logger.Info("✅ gRPC reflection enabled")
	}

	// Register health check service
	healthServer := health.NewServer()
	grpc_health_v1.RegisterHealthServer(server, healthServer)
	healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)

	// Create listener
	addr := fmt.Sprintf(":%s", cfg.Port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on %s: %w", addr, err)
	}

	grpcServer := &GRPCServer{
		Server:   server,
		Listener: listener,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			logger.Info("🚀 Starting gRPC server", zap.String("addr", addr))
			go func() {
				if err := server.Serve(listener); err != nil {
					logger.Error("gRPC server error", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			logger.Info("Shutting down gRPC server...")
			server.GracefulStop()
			return nil
		},
	})

	return grpcServer, nil
}

// registerServices registers all gRPC service handlers
func registerServices(
	server *GRPCServer,
	authHandler *handler.AuthHandler,
	logger *zap.Logger,
) {
	pb.RegisterAuthServiceServer(server.Server, authHandler)
	logger.Info("✅ Registered AuthService gRPC handler")
}
