package ports

import (
	"context"
	"worker/internal/core/domain"
)

// AuthService defines the interface for authentication business logic
type AuthService interface {
	// Register creates a new user account
	Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error)

	// Login authenticates a user and returns tokens
	Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error)

	// RefreshAccessToken generates a new access token using refresh token
	RefreshAccessToken(ctx context.Context, refreshToken string) (*TokenResponse, error)

	// ValidateAccessToken validates an access token and returns user info
	ValidateAccessToken(ctx context.Context, accessToken string) (*ValidateResponse, error)
}

// RegisterRequest represents the registration request
type RegisterRequest struct {
	Email    string
	Password string
	Username string
	FullName string
}

// LoginRequest represents the login request
type LoginRequest struct {
	Identifier string // email or username
	Password   string
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	User         *domain.User
	AccessToken  string
	RefreshToken string
}

// TokenResponse represents token refresh response
type TokenResponse struct {
	AccessToken string
}

// ValidateResponse represents token validation response
type ValidateResponse struct {
	Valid       bool
	UserID      string
	Email       string
	Permissions []string
}
