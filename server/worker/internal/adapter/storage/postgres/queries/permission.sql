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
