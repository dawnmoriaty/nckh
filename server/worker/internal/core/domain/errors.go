package domain

import "errors"

// Domain-specific errors for authentication
var (
	// User errors
	ErrUserNotFound       = errors.New("user not found")
	ErrUserAlreadyExists  = errors.New("user already exists")
	ErrEmailAlreadyExists = errors.New("email already exists")
	ErrUsernameAlreadyExists = errors.New("username already exists")
	ErrUserInactive       = errors.New("user account is inactive")

	// Authentication errors
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrIncorrectPassword  = errors.New("incorrect password")
	ErrInvalidToken       = errors.New("invalid token")
	ErrTokenExpired       = errors.New("token has expired")
	ErrTokenMalformed     = errors.New("token is malformed")

	// Role errors
	ErrRoleNotFound       = errors.New("role not found")
	ErrDefaultRoleNotFound = errors.New("default role not found")

	// Internal errors
	ErrHashingPassword    = errors.New("failed to hash password")
	ErrGeneratingToken    = errors.New("failed to generate token")
	ErrGeneratingUUID     = errors.New("failed to generate UUID")
	ErrDatabaseOperation  = errors.New("database operation failed")
)

// AuthError wraps domain errors with additional context
type AuthError struct {
	Err     error
	Message string
	Code    string
}

func (e *AuthError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return e.Err.Error()
}

func (e *AuthError) Unwrap() error {
	return e.Err
}

// NewAuthError creates a new AuthError
func NewAuthError(err error, message string, code string) *AuthError {
	return &AuthError{
		Err:     err,
		Message: message,
		Code:    code,
	}
}

// Error codes for gRPC status mapping
const (
	CodeUserNotFound       = "USER_NOT_FOUND"
	CodeUserAlreadyExists  = "USER_ALREADY_EXISTS"
	CodeInvalidCredentials = "INVALID_CREDENTIALS"
	CodeIncorrectPassword  = "INCORRECT_PASSWORD"
	CodeInvalidToken       = "INVALID_TOKEN"
	CodeTokenExpired       = "TOKEN_EXPIRED"
	CodeInternalError      = "INTERNAL_ERROR"
)
