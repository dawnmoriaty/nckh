package ports

import (
	"context"
	"worker/internal/core/domain"
)

// UserRepository defines the interface for user data operations
// This follows the Ports pattern in Clean Architecture
type UserRepository interface {
	// FindByID retrieves a user by their UUID
	FindByID(ctx context.Context, id string) (*domain.User, error)

	// FindByEmail retrieves a user by their email address
	FindByEmail(ctx context.Context, email string) (*domain.User, error)

	// FindByUsername retrieves a user by their username
	FindByUsername(ctx context.Context, username string) (*domain.User, error)

	// FindByEmailOrUsername retrieves a user by email or username
	// This is useful for login where user can use either
	FindByEmailOrUsername(ctx context.Context, identifier string) (*domain.User, error)

	// ExistsByEmail checks if a user with the given email exists
	ExistsByEmail(ctx context.Context, email string) (bool, error)

	// ExistsByUsername checks if a user with the given username exists
	ExistsByUsername(ctx context.Context, username string) (bool, error)

	// CreateUser creates a new user in the database
	// Returns the created user with generated ID and timestamps
	CreateUser(ctx context.Context, user *domain.User) (*domain.User, error)

	// UpdateUser updates an existing user
	UpdateUser(ctx context.Context, user *domain.User) (*domain.User, error)

	// UpdateLastLogin updates the last login timestamp for a user
	UpdateLastLogin(ctx context.Context, userID string) error
}

// RoleRepository defines the interface for role data operations
type RoleRepository interface {
	// FindByID retrieves a role by its UUID
	FindByID(ctx context.Context, id string) (*domain.Role, error)

	// FindByCode retrieves a role by its code (e.g., "STUDENT", "ADMIN")
	FindByCode(ctx context.Context, code string) (*domain.Role, error)

	// GetDefaultRole retrieves the default role for new users (usually "STUDENT")
	GetDefaultRole(ctx context.Context) (*domain.Role, error)

	// GetPermissionsByRoleID retrieves all permissions for a given role
	GetPermissionsByRoleID(ctx context.Context, roleID string) ([]string, error)
}
