import { visibleAdminMenus } from '$lib/admin-menu.js';

export const load = ({ locals }) => ({ adminMenus: visibleAdminMenus(locals.adminUser) });
