package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"worker/internal/adapter/storage/postgres/db"
	"worker/internal/core/domain"
)

// UserRepository implements ports.UserRepository using sqlc generated queries
type UserRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

// NewUserRepository creates a new UserRepository instance
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

// FindByID retrieves a user by their UUID
func (r *UserRepository) FindByID(ctx context.Context, id string) (*domain.User, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, domain.ErrUserNotFound
	}

	row, err := r.queries.GetUserByID(ctx, uid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	return mapGetUserByIDRowToDomain(&row), nil
}

// FindByEmail retrieves a user by their email address
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	row, err := r.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	return mapGetUserByEmailRowToDomain(&row), nil
}

// FindByUsername retrieves a user by their username
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	row, err := r.queries.GetUserByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	return mapGetUserByUsernameRowToDomain(&row), nil
}

// FindByEmailOrUsername retrieves a user by email or username
func (r *UserRepository) FindByEmailOrUsername(ctx context.Context, identifier string) (*domain.User, error) {
	row, err := r.queries.GetUserByEmailOrUsername(ctx, identifier)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	return mapGetUserByEmailOrUsernameRowToDomain(&row), nil
}

// ExistsByEmail checks if a user with the given email exists
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	result, err := r.queries.ExistsByEmail(ctx, email)
	if err != nil {
		return false, err
	}
	return result, nil
}

// ExistsByUsername checks if a user with the given username exists
func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	result, err := r.queries.ExistsByUsername(ctx, username)
	if err != nil {
		return false, err
	}
	return result, nil
}

// CreateUser creates a new user in the database
func (r *UserRepository) CreateUser(ctx context.Context, user *domain.User) (*domain.User, error) {
	uid, err := uuid.Parse(user.ID)
	if err != nil {
		return nil, err
	}

	roleID, err := uuid.Parse(user.RoleID)
	if err != nil {
		return nil, err
	}

	params := db.CreateUserParams{
		ID:        uid,
		RoleID:    roleID,
		Email:     user.Email,
		Username:  user.Username,
		Password:  user.Password,
		FullName:  user.FullName,
		Phone:     stringPtr(user.Phone),
		Avatar:    stringPtr(user.Avatar),
		IsActive:  boolPtr(user.IsActive),
		CreatedAt: timeToPgTimestamp(user.CreatedAt),
		UpdatedAt: timeToPgTimestamp(user.UpdatedAt),
	}

	created, err := r.queries.CreateUser(ctx, params)
	if err != nil {
		return nil, err
	}

	return mapDBUserToDomain(&created), nil
}

// UpdateUser updates an existing user
func (r *UserRepository) UpdateUser(ctx context.Context, user *domain.User) (*domain.User, error) {
	uid, err := uuid.Parse(user.ID)
	if err != nil {
		return nil, err
	}

	params := db.UpdateUserParams{
		ID:       uid,
		Email:    user.Email,
		Username: user.Username,
		Password: user.Password,
		FullName: user.FullName,
		Phone:    stringPtr(user.Phone),
		Avatar:   stringPtr(user.Avatar),
		IsActive: boolPtr(user.IsActive),
	}

	updated, err := r.queries.UpdateUser(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	return mapDBUserToDomain(&updated), nil
}

// UpdateLastLogin updates the last login timestamp for a user
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	return r.queries.UpdateLastLogin(ctx, uid)
}

// =============================================================================
// Mapper Functions: Convert sqlc generated types to domain types
// =============================================================================

// mapGetUserByIDRowToDomain maps GetUserByIDRow to domain.User
func mapGetUserByIDRowToDomain(row *db.GetUserByIDRow) *domain.User {
	user := &domain.User{
		ID:        row.ID.String(),
		RoleID:    row.RoleID.String(),
		Email:     row.Email,
		Username:  row.Username,
		Password:  row.Password,
		FullName:  row.FullName,
		IsActive:  ptrBoolValue(row.IsActive),
		CreatedAt: pgTimestampToTime(row.CreatedAt),
		UpdatedAt: pgTimestampToTime(row.UpdatedAt),
	}

	if row.Phone != nil {
		user.Phone = *row.Phone
	}
	if row.Avatar != nil {
		user.Avatar = *row.Avatar
	}
	if row.LastLogin.Valid {
		t := row.LastLogin.Time
		user.LastLogin = &t
	}
	if row.RoleName != nil {
		user.RoleName = *row.RoleName
	}
	if row.RoleCode != nil {
		user.RoleCode = *row.RoleCode
	}

	return user
}

// mapGetUserByEmailRowToDomain maps GetUserByEmailRow to domain.User
func mapGetUserByEmailRowToDomain(row *db.GetUserByEmailRow) *domain.User {
	user := &domain.User{
		ID:        row.ID.String(),
		RoleID:    row.RoleID.String(),
		Email:     row.Email,
		Username:  row.Username,
		Password:  row.Password,
		FullName:  row.FullName,
		IsActive:  ptrBoolValue(row.IsActive),
		CreatedAt: pgTimestampToTime(row.CreatedAt),
		UpdatedAt: pgTimestampToTime(row.UpdatedAt),
	}

	if row.Phone != nil {
		user.Phone = *row.Phone
	}
	if row.Avatar != nil {
		user.Avatar = *row.Avatar
	}
	if row.LastLogin.Valid {
		t := row.LastLogin.Time
		user.LastLogin = &t
	}
	if row.RoleName != nil {
		user.RoleName = *row.RoleName
	}
	if row.RoleCode != nil {
		user.RoleCode = *row.RoleCode
	}

	return user
}

// mapGetUserByUsernameRowToDomain maps GetUserByUsernameRow to domain.User
func mapGetUserByUsernameRowToDomain(row *db.GetUserByUsernameRow) *domain.User {
	user := &domain.User{
		ID:        row.ID.String(),
		RoleID:    row.RoleID.String(),
		Email:     row.Email,
		Username:  row.Username,
		Password:  row.Password,
		FullName:  row.FullName,
		IsActive:  ptrBoolValue(row.IsActive),
		CreatedAt: pgTimestampToTime(row.CreatedAt),
		UpdatedAt: pgTimestampToTime(row.UpdatedAt),
	}

	if row.Phone != nil {
		user.Phone = *row.Phone
	}
	if row.Avatar != nil {
		user.Avatar = *row.Avatar
	}
	if row.LastLogin.Valid {
		t := row.LastLogin.Time
		user.LastLogin = &t
	}
	if row.RoleName != nil {
		user.RoleName = *row.RoleName
	}
	if row.RoleCode != nil {
		user.RoleCode = *row.RoleCode
	}

	return user
}

// mapGetUserByEmailOrUsernameRowToDomain maps GetUserByEmailOrUsernameRow to domain.User
func mapGetUserByEmailOrUsernameRowToDomain(row *db.GetUserByEmailOrUsernameRow) *domain.User {
	user := &domain.User{
		ID:        row.ID.String(),
		RoleID:    row.RoleID.String(),
		Email:     row.Email,
		Username:  row.Username,
		Password:  row.Password,
		FullName:  row.FullName,
		IsActive:  ptrBoolValue(row.IsActive),
		CreatedAt: pgTimestampToTime(row.CreatedAt),
		UpdatedAt: pgTimestampToTime(row.UpdatedAt),
	}

	if row.Phone != nil {
		user.Phone = *row.Phone
	}
	if row.Avatar != nil {
		user.Avatar = *row.Avatar
	}
	if row.LastLogin.Valid {
		t := row.LastLogin.Time
		user.LastLogin = &t
	}
	if row.RoleName != nil {
		user.RoleName = *row.RoleName
	}
	if row.RoleCode != nil {
		user.RoleCode = *row.RoleCode
	}

	return user
}

// mapDBUserToDomain maps the db.User (from CreateUser/UpdateUser) to domain.User
func mapDBUserToDomain(dbUser *db.User) *domain.User {
	user := &domain.User{
		ID:        dbUser.ID.String(),
		RoleID:    dbUser.RoleID.String(),
		Email:     dbUser.Email,
		Username:  dbUser.Username,
		Password:  dbUser.Password,
		FullName:  dbUser.FullName,
		IsActive:  ptrBoolValue(dbUser.IsActive),
		CreatedAt: pgTimestampToTime(dbUser.CreatedAt),
		UpdatedAt: pgTimestampToTime(dbUser.UpdatedAt),
	}

	if dbUser.Phone != nil {
		user.Phone = *dbUser.Phone
	}
	if dbUser.Avatar != nil {
		user.Avatar = *dbUser.Avatar
	}
	if dbUser.LastLogin.Valid {
		t := dbUser.LastLogin.Time
		user.LastLogin = &t
	}

	return user
}

// =============================================================================
// Helper Functions
// =============================================================================

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func boolPtr(b bool) *bool {
	return &b
}

func ptrBoolValue(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

func timeToPgTimestamp(t time.Time) pgtype.Timestamp {
	if t.IsZero() {
		return pgtype.Timestamp{Valid: false}
	}
	return pgtype.Timestamp{Time: t, Valid: true}
}

func pgTimestampToTime(ts pgtype.Timestamp) time.Time {
	if !ts.Valid {
		return time.Time{}
	}
	return ts.Time
}
