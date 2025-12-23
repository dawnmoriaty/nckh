-- =============================================
-- User Queries
-- =============================================

-- name: CreateUser :one
-- Creates a new user and returns the created record
INSERT INTO users (
    id,
    role_id,
    email,
    username,
    password,
    full_name,
    phone,
    avatar,
    is_active,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
) RETURNING *;

-- name: GetUserByID :one
-- Retrieves a user by their UUID
SELECT 
    u.*,
    r.name AS role_name,
    r.code AS role_code
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.id = $1;

-- name: GetUserByEmail :one
-- Retrieves a user by their email address
SELECT 
    u.*,
    r.name AS role_name,
    r.code AS role_code
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = $1;

-- name: GetUserByUsername :one
-- Retrieves a user by their username
SELECT 
    u.*,
    r.name AS role_name,
    r.code AS role_code
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.username = $1;

-- name: GetUserByEmailOrUsername :one
-- Retrieves a user by email OR username (for login)
SELECT 
    u.*,
    r.name AS role_name,
    r.code AS role_code
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = $1 OR u.username = $1;

-- name: ExistsByEmail :one
-- Checks if a user with the given email exists
SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) AS exists;

-- name: ExistsByUsername :one
-- Checks if a user with the given username exists
SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) AS exists;

-- name: UpdateUser :one
-- Updates an existing user
UPDATE users SET
    email = COALESCE($2, email),
    username = COALESCE($3, username),
    password = COALESCE($4, password),
    full_name = COALESCE($5, full_name),
    phone = COALESCE($6, phone),
    avatar = COALESCE($7, avatar),
    is_active = COALESCE($8, is_active),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateLastLogin :exec
-- Updates the last login timestamp for a user
UPDATE users SET last_login = NOW() WHERE id = $1;

-- name: DeleteUser :exec
-- Soft delete is not implemented, this is hard delete
DELETE FROM users WHERE id = $1;

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

-- =============================================
-- Permission Queries
-- =============================================

-- name: GetPermissionsByRoleID :many
-- Retrieves all permissions for a given role
SELECT 
    p.id,
    p.role_id,
    p.resource_id,
    p.actions,
    r.code AS resource_code,
    r.name AS resource_name
FROM permissions p
JOIN resources r ON p.resource_id = r.id
WHERE p.role_id = $1;

-- name: GetPermissionActionsByRoleID :many
-- Retrieves flattened permission actions for a role (e.g., "users:read", "users:write")
SELECT DISTINCT
    r.code || ':' || action AS permission
FROM permissions p
JOIN resources r ON p.resource_id = r.id,
LATERAL jsonb_array_elements_text(p.actions) AS action
WHERE p.role_id = $1;
