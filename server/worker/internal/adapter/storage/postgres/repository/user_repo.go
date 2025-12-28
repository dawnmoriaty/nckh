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

// UserRepository implements ports.UserRepository using sqlc generated queries
// Returns sqlc types directly - no mapping needed
type UserRepository struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
}

// NewUserRepository creates a new UserRepository instance
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		pool:    pool,
		queries: sqlc.New(pool),
	}
}

// FindByID retrieves a user by their UUID (includes role info)
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*sqlc.GetUserByIDRow, error) {
	row, err := r.queries.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &row, nil
}

// FindByEmail retrieves a user by their email address (includes role info)
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*sqlc.GetUserByEmailRow, error) {
	row, err := r.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &row, nil
}

// FindByUsername retrieves a user by their username (includes role info)
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*sqlc.GetUserByUsernameRow, error) {
	row, err := r.queries.GetUserByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &row, nil
}

// FindByEmailOrUsername retrieves a user by email or username (includes role info)
func (r *UserRepository) FindByEmailOrUsername(ctx context.Context, identifier string) (*sqlc.GetUserByEmailOrUsernameRow, error) {
	row, err := r.queries.GetUserByEmailOrUsername(ctx, identifier)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &row, nil
}

// ExistsByEmail checks if a user with the given email exists
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	return r.queries.ExistsByEmail(ctx, email)
}

// ExistsByUsername checks if a user with the given username exists
func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	return r.queries.ExistsByUsername(ctx, username)
}

// CreateUser creates a new user in the database
func (r *UserRepository) CreateUser(ctx context.Context, params sqlc.CreateUserParams) (*sqlc.User, error) {
	created, err := r.queries.CreateUser(ctx, params)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// UpdateUser updates an existing user
func (r *UserRepository) UpdateUser(ctx context.Context, params sqlc.UpdateUserParams) (*sqlc.User, error) {
	updated, err := r.queries.UpdateUser(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &updated, nil
}

// UpdateLastLogin updates the last login timestamp for a user
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID uuid.UUID) error {
	return r.queries.UpdateLastLogin(ctx, userID)
}
