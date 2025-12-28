-- =============================================
-- Role Queries
-- =============================================

-- name: GetRoleByID :one
-- Retrieves a role by its UUID
SELECT * FROM roles WHERE id = $1;

-- name: GetRoleByCode :one
-- Retrieves a role by its code (e.g., "STUDENT", "ADMIN")
SELECT * FROM roles WHERE code = $1;

-- name: GetDefaultRole :one
-- Retrieves the default role for new users (STUDENT)
SELECT * FROM roles WHERE code = 'STUDENT' LIMIT 1;

-- name: CreateRole :one
-- Creates a new role
INSERT INTO roles (name, code, description)
VALUES ($1, $2, $3)
RETURNING *;
