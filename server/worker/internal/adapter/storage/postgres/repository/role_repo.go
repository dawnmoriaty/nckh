package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"worker/internal/adapter/storage/postgres/sqlc"
	"worker/internal/core/domain"
)

// RoleRepository implements ports.RoleRepository using sqlc generated queries
// Returns sqlc types directly - no mapping needed
type RoleRepository struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
}

// NewRoleRepository creates a new RoleRepository instance
func NewRoleRepository(pool *pgxpool.Pool) *RoleRepository {
	return &RoleRepository{
		pool:    pool,
		queries: sqlc.New(pool),
	}
}

// FindByID retrieves a role by its UUID
func (r *RoleRepository) FindByID(ctx context.Context, id uuid.UUID) (*sqlc.Role, error) {
	role, err := r.queries.GetRoleByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

// FindByCode retrieves a role by its code (e.g., "STUDENT", "ADMIN")
func (r *RoleRepository) FindByCode(ctx context.Context, code string) (*sqlc.Role, error) {
	role, err := r.queries.GetRoleByCode(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

// GetDefaultRole retrieves the default role for new users (usually "STUDENT")
func (r *RoleRepository) GetDefaultRole(ctx context.Context) (*sqlc.Role, error) {
	role, err := r.queries.GetDefaultRole(ctx)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrDefaultRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

// GetPermissionsByRoleID retrieves all permissions for a given role
// Returns a flattened list of permission strings (e.g., "users:read", "users:write")
func (r *RoleRepository) GetPermissionsByRoleID(ctx context.Context, roleID uuid.UUID) ([]string, error) {
	permissions, err := r.queries.GetPermissionActionsByRoleID(ctx, roleID)
	if err != nil {
		return nil, err
	}

	// Convert interface{} slice to string slice
	result := make([]string, 0, len(permissions))
	for _, p := range permissions {
		if str, ok := p.(string); ok {
			result = append(result, str)
		}
	}

	return result, nil
}
