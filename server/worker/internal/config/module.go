package config

import "go.uber.org/fx"

// Module provides configuration dependencies
var Module = fx.Module("config",
	fx.Provide(
		LoadConfig,
		// Extract individual configs for easier injection
		provideJWTConfig,
		provideDatabaseConfig,
		provideGRPCConfig,
		provideServerConfig,
	),
)

func provideJWTConfig(cfg *Config) *JWTConfig {
	return &cfg.JWT
}

func provideDatabaseConfig(cfg *Config) *DatabaseConfig {
	return &cfg.Database
}

func provideGRPCConfig(cfg *Config) *GRPCConfig {
	return &cfg.GRPC
}

func provideServerConfig(cfg *Config) *ServerConfig {
	return &cfg.Server
}
