package ports

import (
	"context"

	"github.com/google/uuid"

	"worker/internal/adapter/storage/postgres/sqlc"
)

// UserRepository defines the interface for user data operations
// Returns sqlc generated types directly - no need to duplicate models
type UserRepository interface {
	// FindByID retrieves a user by their UUID (includes role info)
	FindByID(ctx context.Context, id uuid.UUID) (*sqlc.GetUserByIDRow, error)

	// FindByEmail retrieves a user by their email address (includes role info)
	FindByEmail(ctx context.Context, email string) (*sqlc.GetUserByEmailRow, error)

	// FindByUsername retrieves a user by their username (includes role info)
	FindByUsername(ctx context.Context, username string) (*sqlc.GetUserByUsernameRow, error)

	// FindByEmailOrUsername retrieves a user by email or username (includes role info)
	// This is useful for login where user can use either
	FindByEmailOrUsername(ctx context.Context, identifier string) (*sqlc.GetUserByEmailOrUsernameRow, error)

	// ExistsByEmail checks if a user with the given email exists
	ExistsByEmail(ctx context.Context, email string) (bool, error)

	// ExistsByUsername checks if a user with the given username exists
	ExistsByUsername(ctx context.Context, username string) (bool, error)

	// CreateUser creates a new user in the database
	// Returns the created user (without role info, just base user)
	CreateUser(ctx context.Context, params sqlc.CreateUserParams) (*sqlc.User, error)

	// UpdateUser updates an existing user
	UpdateUser(ctx context.Context, params sqlc.UpdateUserParams) (*sqlc.User, error)

	// UpdateLastLogin updates the last login timestamp for a user
	UpdateLastLogin(ctx context.Context, userID uuid.UUID) error
}

// RoleRepository defines the interface for role data operations
type RoleRepository interface {
	// FindByID retrieves a role by its UUID
	FindByID(ctx context.Context, id uuid.UUID) (*sqlc.Role, error)

	// FindByCode retrieves a role by its code (e.g., "STUDENT", "ADMIN")
	FindByCode(ctx context.Context, code string) (*sqlc.Role, error)

	// GetDefaultRole retrieves the default role for new users (usually "STUDENT")
	GetDefaultRole(ctx context.Context) (*sqlc.Role, error)

	// GetPermissionsByRoleID retrieves all permission strings for a given role
	GetPermissionsByRoleID(ctx context.Context, roleID uuid.UUID) ([]string, error)
}
