package domain

// =============================================================================
// Authentication Types (NOT duplicating sqlc models)
// =============================================================================

// TokenPair contains access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// =============================================================================
// Service Request/Response Types
// These are used by the auth service layer, NOT duplicating DB models
// =============================================================================

// RegisterRequest represents input for user registration
type RegisterRequest struct {
	Username string
	Email    string
	Password string // Raw password (will be hashed)
	FullName string
}

// LoginRequest represents input for user login
type LoginRequest struct {
	Identifier string // email or username
	Password   string
}

// ValidateTokenResult represents the result of token validation
type ValidateTokenResult struct {
	Valid       bool
	UserID      string
	Email       string
	Permissions []string
}
