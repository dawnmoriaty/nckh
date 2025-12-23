package domain

import (
	"time"
)

// User represents the user entity in the domain layer
type User struct {
	ID        string     `json:"id"`
	RoleID    string     `json:"role_id"`
	Email     string     `json:"email"`
	Username  string     `json:"username"`
	Password  string     `json:"-"` // Never serialize password
	FullName  string     `json:"full_name"`
	Phone     string     `json:"phone,omitempty"`
	Avatar    string     `json:"avatar,omitempty"`
	IsActive  bool       `json:"is_active"`
	LastLogin *time.Time `json:"last_login,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	// Joined from roles table
	RoleName    string   `json:"role_name,omitempty"`
	RoleCode    string   `json:"role_code,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

// Role represents a user role
type Role struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateUserInput represents input for creating a new user
type CreateUserInput struct {
	Username string
	Email    string
	Password string // Raw password (will be hashed)
	FullName string
	Phone    string
	RoleID   string // Optional: if not provided, default role will be used
}

// TokenPair contains access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// LoginResult contains the result of a successful login
type LoginResult struct {
	User         *User  `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}
