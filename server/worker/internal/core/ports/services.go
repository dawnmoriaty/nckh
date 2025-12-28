package ports

import (
	"context"

	"worker/internal/adapter/storage/postgres/sqlc"
	"worker/internal/core/domain"
)

// AuthService defines the interface for authentication business logic
type AuthService interface {
	// Register creates a new user account
	Register(ctx context.Context, req *domain.RegisterRequest) (*AuthResponse, error)

	// Login authenticates a user and returns tokens
	Login(ctx context.Context, req *domain.LoginRequest) (*AuthResponse, error)

	// RefreshAccessToken generates a new access token using refresh token
	RefreshAccessToken(ctx context.Context, refreshToken string) (*TokenResponse, error)

	// ValidateAccessToken validates an access token and returns user info
	ValidateAccessToken(ctx context.Context, accessToken string) (*domain.ValidateTokenResult, error)
}

// AuthResponse represents the authentication response with user and tokens
// Uses sqlc.GetUserByEmailOrUsernameRow which includes role info
type AuthResponse struct {
	User         *sqlc.GetUserByEmailOrUsernameRow
	AccessToken  string
	RefreshToken string
}

// TokenResponse represents token refresh response
type TokenResponse struct {
	AccessToken string
}
