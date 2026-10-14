export function hasAdminPermission(admin, permission) {
 return !!admin && (admin.role === 'super_admin' || admin.permissions?.includes('*') || admin.permissions?.includes(permission) || !permission);
}
