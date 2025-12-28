package services

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	"worker/internal/adapter/storage/postgres/sqlc"
	"worker/internal/common/utils"
	"worker/internal/config"
	"worker/internal/core/domain"
	"worker/internal/core/ports"
)

// Ensure AuthService implements ports.AuthService
var _ ports.AuthService = (*AuthService)(nil)

// AuthService handles authentication business logic
// Following Clean Architecture, this service only depends on abstractions (ports)
type AuthService struct {
	userRepo ports.UserRepository
	roleRepo ports.RoleRepository
	config   *config.JWTConfig
}

// NewAuthService creates a new AuthService instance
func NewAuthService(
	userRepo ports.UserRepository,
	roleRepo ports.RoleRepository,
	jwtConfig *config.JWTConfig,
) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		roleRepo: roleRepo,
		config:   jwtConfig,
	}
}

// AccessTokenClaims represents the claims in an access token
type AccessTokenClaims struct {
	jwt.RegisteredClaims
	Username string `json:"username"`
	Role     string `json:"role"`
}

// RefreshTokenClaims represents the claims in a refresh token
type RefreshTokenClaims struct {
	jwt.RegisteredClaims
}

// Register creates a new user account
func (s *AuthService) Register(ctx context.Context, req *domain.RegisterRequest) (*ports.AuthResponse, error) {
	// Step 1: Check if email already exists
	emailExists, err := s.userRepo.ExistsByEmail(ctx, req.Email)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrDatabaseOperation,
			"failed to check email existence",
			domain.CodeInternalError,
		)
	}
	if emailExists {
		return nil, domain.NewAuthError(
			domain.ErrEmailAlreadyExists,
			"email is already registered",
			domain.CodeUserAlreadyExists,
		)
	}

	// Step 2: Check if username already exists
	usernameExists, err := s.userRepo.ExistsByUsername(ctx, req.Username)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrDatabaseOperation,
			"failed to check username existence",
			domain.CodeInternalError,
		)
	}
	if usernameExists {
		return nil, domain.NewAuthError(
			domain.ErrUsernameAlreadyExists,
			"username is already taken",
			domain.CodeUserAlreadyExists,
		)
	}

	// Step 3: Hash the password using bcrypt with default cost
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrHashingPassword,
			"failed to secure password",
			domain.CodeInternalError,
		)
	}

	// Step 4: Generate a new UUID for the user
	userID, err := uuid.NewV7()
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrGeneratingUUID,
			"failed to generate user ID",
			domain.CodeInternalError,
		)
	}

	// Step 5: Get default role
	defaultRole, err := s.roleRepo.GetDefaultRole(ctx)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrDefaultRoleNotFound,
			"failed to assign default role",
			domain.CodeInternalError,
		)
	}

	// Step 6: Create user params for sqlc
	now := time.Now()
	isActive := true
	createParams := sqlc.CreateUserParams{
		ID:        userID,
		RoleID:    defaultRole.ID,
		Email:     req.Email,
		Username:  req.Username,
		Password:  string(hashedPassword),
		FullName:  req.FullName,
		IsActive:  &isActive,
		CreatedAt: pgtype.Timestamp{Time: now, Valid: true},
		UpdatedAt: pgtype.Timestamp{Time: now, Valid: true},
	}

	// Step 7: Save to database via repository
	createdUser, err := s.userRepo.CreateUser(ctx, createParams)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrDatabaseOperation,
			"failed to create user account",
			domain.CodeInternalError,
		)
	}

	// Step 8: Build response with role info
	// Convert sqlc.User to sqlc.GetUserByEmailOrUsernameRow for response
	userWithRole := &sqlc.GetUserByEmailOrUsernameRow{
		ID:        createdUser.ID,
		RoleID:    createdUser.RoleID,
		Email:     createdUser.Email,
		Username:  createdUser.Username,
		Password:  "", // Clear password
		FullName:  createdUser.FullName,
		Phone:     createdUser.Phone,
		Avatar:    createdUser.Avatar,
		IsActive:  createdUser.IsActive,
		LastLogin: createdUser.LastLogin,
		CreatedAt: createdUser.CreatedAt,
		UpdatedAt: createdUser.UpdatedAt,
		RoleName:  &defaultRole.Name,
		RoleCode:  &defaultRole.Code,
	}

	// Step 9: Generate tokens
	accessToken, err := s.generateAccessToken(userWithRole)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrGeneratingToken,
			"failed to generate access token",
			domain.CodeInternalError,
		)
	}

	refreshToken, err := s.generateRefreshToken(userID.String())
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrGeneratingToken,
			"failed to generate refresh token",
			domain.CodeInternalError,
		)
	}

	return &ports.AuthResponse{
		User:         userWithRole,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// Login authenticates a user and generates JWT tokens
func (s *AuthService) Login(ctx context.Context, req *domain.LoginRequest) (*ports.AuthResponse, error) {
	// Step 1: Fetch user from repository by email or username
	user, err := s.userRepo.FindByEmailOrUsername(ctx, req.Identifier)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil, domain.NewAuthError(
				domain.ErrUserNotFound,
				"user not found with provided credentials",
				domain.CodeUserNotFound,
			)
		}
		return nil, domain.NewAuthError(
			domain.ErrDatabaseOperation,
			"failed to fetch user",
			domain.CodeInternalError,
		)
	}

	// Step 2: Check if user account is active
	if !utils.PtrBoolValue(user.IsActive) {
		return nil, domain.NewAuthError(
			domain.ErrUserInactive,
			"user account is deactivated",
			domain.CodeInvalidCredentials,
		)
	}

	// Step 3: Compare provided password with hashed password using bcrypt
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return nil, domain.NewAuthError(
				domain.ErrIncorrectPassword,
				"incorrect password",
				domain.CodeIncorrectPassword,
			)
		}
		return nil, domain.NewAuthError(
			domain.ErrInvalidCredentials,
			"password verification failed",
			domain.CodeInternalError,
		)
	}

	// Step 4: Generate Access Token
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrGeneratingToken,
			"failed to generate access token",
			domain.CodeInternalError,
		)
	}

	// Step 5: Generate Refresh Token
	refreshToken, err := s.generateRefreshToken(user.ID.String())
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrGeneratingToken,
			"failed to generate refresh token",
			domain.CodeInternalError,
		)
	}

	// Step 6: Update last login timestamp (non-blocking)
	go func() {
		_ = s.userRepo.UpdateLastLogin(context.Background(), user.ID)
	}()

	// Step 7: Clear password before returning
	user.Password = ""

	return &ports.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// RefreshAccessToken generates a new access token using a valid refresh token
func (s *AuthService) RefreshAccessToken(ctx context.Context, refreshToken string) (*ports.TokenResponse, error) {
	// Step 1: Parse and validate the refresh token
	claims, err := s.parseRefreshToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Step 2: Get user ID from claims
	userIDStr, err := claims.GetSubject()
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrInvalidToken,
			"invalid token subject",
			domain.CodeInvalidToken,
		)
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrInvalidToken,
			"invalid user ID in token",
			domain.CodeInvalidToken,
		)
	}

	// Step 3: Fetch user from database to ensure they still exist and are active
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil, domain.NewAuthError(
				domain.ErrUserNotFound,
				"user no longer exists",
				domain.CodeUserNotFound,
			)
		}
		return nil, domain.NewAuthError(
			domain.ErrDatabaseOperation,
			"failed to verify user",
			domain.CodeInternalError,
		)
	}

	if !utils.PtrBoolValue(user.IsActive) {
		return nil, domain.NewAuthError(
			domain.ErrUserInactive,
			"user account is deactivated",
			domain.CodeInvalidCredentials,
		)
	}

	// Step 4: Convert GetUserByIDRow to GetUserByEmailOrUsernameRow for token generation
	userForToken := &sqlc.GetUserByEmailOrUsernameRow{
		ID:        user.ID,
		RoleID:    user.RoleID,
		Email:     user.Email,
		Username:  user.Username,
		RoleName:  user.RoleName,
		RoleCode:  user.RoleCode,
	}

	// Step 5: Generate new access token
	newAccessToken, err := s.generateAccessToken(userForToken)
	if err != nil {
		return nil, domain.NewAuthError(
			domain.ErrGeneratingToken,
			"failed to generate new access token",
			domain.CodeInternalError,
		)
	}

	return &ports.TokenResponse{
		AccessToken: newAccessToken,
	}, nil
}

// ValidateAccessToken validates an access token and returns the claims
func (s *AuthService) ValidateAccessToken(ctx context.Context, tokenString string) (*domain.ValidateTokenResult, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AccessTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domain.ErrTokenMalformed
		}
		return []byte(s.config.AccessSecret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, domain.NewAuthError(
				domain.ErrTokenExpired,
				"access token has expired",
				domain.CodeTokenExpired,
			)
		}
		return nil, domain.NewAuthError(
			domain.ErrInvalidToken,
			"invalid access token",
			domain.CodeInvalidToken,
		)
	}

	claims, ok := token.Claims.(*AccessTokenClaims)
	if !ok || !token.Valid {
		return nil, domain.NewAuthError(
			domain.ErrInvalidToken,
			"invalid token claims",
			domain.CodeInvalidToken,
		)
	}

	// Parse user ID
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return &domain.ValidateTokenResult{
			Valid:       true,
			UserID:      claims.Subject,
			Email:       "",
			Permissions: []string{},
		}, nil
	}

	// Fetch user to get email and permissions
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return &domain.ValidateTokenResult{
			Valid:       true,
			UserID:      claims.Subject,
			Email:       "",
			Permissions: []string{},
		}, nil
	}

	permissions, _ := s.roleRepo.GetPermissionsByRoleID(ctx, user.RoleID)

	return &domain.ValidateTokenResult{
		Valid:       true,
		UserID:      claims.Subject,
		Email:       user.Email,
		Permissions: permissions,
	}, nil
}

// generateAccessToken creates a new JWT access token
func (s *AuthService) generateAccessToken(user *sqlc.GetUserByEmailOrUsernameRow) (string, error) {
	now := time.Now()
	expirationTime := now.Add(s.config.AccessExpiration)

	roleCode := ""
	if user.RoleCode != nil {
		roleCode = *user.RoleCode
	}

	claims := &AccessTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			Issuer:    "worker-auth-service",
		},
		Username: user.Username,
		Role:     roleCode,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.AccessSecret))
}

// generateRefreshToken creates a new JWT refresh token
func (s *AuthService) generateRefreshToken(userID string) (string, error) {
	now := time.Now()
	expirationTime := now.Add(s.config.RefreshExpiration)

	claims := &RefreshTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			Issuer:    "worker-auth-service",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.RefreshSecret))
}

// parseRefreshToken parses and validates a refresh token
func (s *AuthService) parseRefreshToken(tokenString string) (*RefreshTokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domain.ErrTokenMalformed
		}
		return []byte(s.config.RefreshSecret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, domain.NewAuthError(
				domain.ErrTokenExpired,
				"refresh token has expired",
				domain.CodeTokenExpired,
			)
		}
		return nil, domain.NewAuthError(
			domain.ErrInvalidToken,
			"invalid refresh token",
			domain.CodeInvalidToken,
		)
	}

	claims, ok := token.Claims.(*RefreshTokenClaims)
	if !ok || !token.Valid {
		return nil, domain.NewAuthError(
			domain.ErrInvalidToken,
			"invalid token claims",
			domain.CodeInvalidToken,
		)
	}

	return claims, nil
}
