package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"worker/internal/adapter/storage/postgres/repository"
	"worker/internal/config"
	"worker/internal/core/ports"
)

// Module provides PostgreSQL storage dependencies
var Module = fx.Module("postgres",
	fx.Provide(
		NewPostgresPool,
		// Repositories - implement ports interfaces
		fx.Annotate(
			repository.NewUserRepository,
			fx.As(new(ports.UserRepository)),
		),
		fx.Annotate(
			repository.NewRoleRepository,
			fx.As(new(ports.RoleRepository)),
		),
	),
	fx.Invoke(verifyConnection),
)

// NewPostgresPool creates a new PostgreSQL connection pool
func NewPostgresPool(lc fx.Lifecycle, cfg *config.DatabaseConfig, logger *zap.Logger) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(context.Background(), cfg.GetDSN())
	if err != nil {
		return nil, fmt.Errorf("failed to create postgres pool: %w", err)
	}

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			logger.Info("Closing PostgreSQL connection pool...")
			pool.Close()
			return nil
		},
	})

	return pool, nil
}

// verifyConnection verifies the database connection on startup
func verifyConnection(pool *pgxpool.Pool, logger *zap.Logger) error {
	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}
	logger.Info("✅ Connected to PostgreSQL")
	return nil
}
