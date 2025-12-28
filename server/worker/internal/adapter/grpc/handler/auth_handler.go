package handler

import (
	"context"

	"worker/internal/core/domain"
	"worker/internal/core/ports"
	pb "worker/pb"
)

// AuthHandler implements the gRPC AuthServiceServer interface
type AuthHandler struct {
	pb.UnimplementedAuthServiceServer
	authService ports.AuthService
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(authService ports.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register handles user registration
func (h *AuthHandler) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	result, err := h.authService.Register(ctx, &domain.RegisterRequest{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		FullName: req.FullName,
	})
	if err != nil {
		return &pb.RegisterResponse{
			Success: false,
			Message: err.Error(),
		}, MapDomainErrorToGRPC(err)
	}

	return &pb.RegisterResponse{
		Success: true,
		Message: "User registered successfully",
		User:    MapUserRowToProto(result.User),
	}, nil
}

// Login handles user login
func (h *AuthHandler) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	result, err := h.authService.Login(ctx, &domain.LoginRequest{
		Identifier: req.Username,
		Password:   req.Password,
	})
	if err != nil {
		return &pb.LoginResponse{
			Success: false,
			Message: err.Error(),
		}, MapDomainErrorToGRPC(err)
	}

	return &pb.LoginResponse{
		Success:      true,
		Message:      "Login successful",
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		User:         MapUserRowToProto(result.User),
	}, nil
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	result, err := h.authService.RefreshAccessToken(ctx, req.RefreshToken)
	if err != nil {
		return &pb.RefreshTokenResponse{
			Success: false,
			Message: err.Error(),
		}, MapDomainErrorToGRPC(err)
	}

	return &pb.RefreshTokenResponse{
		Success:     true,
		Message:     "Token refreshed successfully",
		AccessToken: result.AccessToken,
	}, nil
}

// ValidateToken validates an access token
func (h *AuthHandler) ValidateToken(ctx context.Context, req *pb.ValidateTokenRequest) (*pb.ValidateTokenResponse, error) {
	result, err := h.authService.ValidateAccessToken(ctx, req.AccessToken)
	if err != nil {
		return &pb.ValidateTokenResponse{
			Valid:   false,
			Message: err.Error(),
		}, nil // Return nil error, just mark as invalid
	}

	return &pb.ValidateTokenResponse{
		Valid:   result.Valid,
		Message: "Token is valid",
		User: &pb.User{
			Id:          result.UserID,
			Email:       result.Email,
			Permissions: result.Permissions,
		},
	}, nil
}
