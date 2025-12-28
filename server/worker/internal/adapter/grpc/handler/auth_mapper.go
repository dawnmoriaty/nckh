package handler

import (
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"worker/internal/adapter/storage/postgres/sqlc"
	"worker/internal/common/utils"
	"worker/internal/core/domain"
	pb "worker/pb"
)

// =============================================================================
// Auth Mapper Functions: Convert sqlc types to protobuf types
// =============================================================================

// MapUserRowToProto converts sqlc.GetUserByEmailOrUsernameRow to protobuf User
func MapUserRowToProto(user *sqlc.GetUserByEmailOrUsernameRow) *pb.User {
	if user == nil {
		return nil
	}

	return &pb.User{
		Id:       user.ID.String(),
		Username: user.Username,
		Email:    user.Email,
		FullName: user.FullName,
		RoleId:   user.RoleID.String(),
		RoleName: utils.PtrStringValue(user.RoleName),
		RoleCode: utils.PtrStringValue(user.RoleCode),
	}
}

// MapDomainErrorToGRPC converts domain errors to gRPC status errors
func MapDomainErrorToGRPC(err error) error {
	if err == nil {
		return nil
	}

	// Check for AuthError type
	if authErr, ok := err.(*domain.AuthError); ok {
		switch authErr.Code {
		case domain.CodeUserNotFound:
			return status.Error(codes.NotFound, authErr.Message)
		case domain.CodeUserAlreadyExists:
			return status.Error(codes.AlreadyExists, authErr.Message)
		case domain.CodeInvalidCredentials, domain.CodeIncorrectPassword:
			return status.Error(codes.Unauthenticated, authErr.Message)
		case domain.CodeInvalidToken, domain.CodeTokenExpired:
			return status.Error(codes.Unauthenticated, authErr.Message)
		default:
			return status.Error(codes.Internal, authErr.Message)
		}
	}

	// Default to internal error for unknown error types
	return status.Error(codes.Internal, err.Error())
}
