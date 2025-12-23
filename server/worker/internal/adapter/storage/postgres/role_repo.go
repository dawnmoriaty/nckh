package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"worker/internal/adapter/storage/postgres/db"
	"worker/internal/core/domain"
)

// RoleRepository implements ports.RoleRepository using sqlc generated queries
type RoleRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

// NewRoleRepository creates a new RoleRepository instance
func NewRoleRepository(pool *pgxpool.Pool) *RoleRepository {
	return &RoleRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

// FindByID retrieves a role by its UUID
func (r *RoleRepository) FindByID(ctx context.Context, id string) (*domain.Role, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, domain.ErrRoleNotFound
	}

	role, err := r.queries.GetRoleByID(ctx, uid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrRoleNotFound
		}
		return nil, err
	}

	return mapDBRoleToDomain(&role), nil
}

// FindByCode retrieves a role by its code (e.g., "STUDENT", "ADMIN")
func (r *RoleRepository) FindByCode(ctx context.Context, code string) (*domain.Role, error) {
	role, err := r.queries.GetRoleByCode(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrRoleNotFound
		}
		return nil, err
	}

	return mapDBRoleToDomain(&role), nil
}

// GetDefaultRole retrieves the default role for new users (usually "STUDENT")
func (r *RoleRepository) GetDefaultRole(ctx context.Context) (*domain.Role, error) {
	role, err := r.queries.GetDefaultRole(ctx)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrDefaultRoleNotFound
		}
		return nil, err
	}

	return mapDBRoleToDomain(&role), nil
}

// GetPermissionsByRoleID retrieves all permissions for a given role
// Returns a flattened list of permission strings (e.g., "users:read", "users:write")
func (r *RoleRepository) GetPermissionsByRoleID(ctx context.Context, roleID string) ([]string, error) {
	uid, err := uuid.Parse(roleID)
	if err != nil {
		return nil, err
	}

	permissions, err := r.queries.GetPermissionActionsByRoleID(ctx, uid)
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

// =============================================================================
// Mapper Functions
// =============================================================================

func mapDBRoleToDomain(dbRole *db.Role) *domain.Role {
	role := &domain.Role{
		ID:   dbRole.ID.String(),
		Name: dbRole.Name,
		Code: dbRole.Code,
	}

	// Handle pgtype.Timestamp
	if dbRole.CreatedAt.Valid {
		role.CreatedAt = dbRole.CreatedAt.Time
	}

	if dbRole.Description != nil {
		role.Description = *dbRole.Description
	}

	return role
}
