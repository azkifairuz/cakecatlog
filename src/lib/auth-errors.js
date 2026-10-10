export function isAuthError(err) {
	if (!err) return false;
	if (err.status === 401 || err.status === 403) return true;
	if (err.code === 'HTTP_401' || err.code === 'HTTP_403' || err.code === 'UNAUTHORIZED') return true;
	const msg = String(err.message || '').toLowerCase();
	return (
		msg.includes('token tidak valid') ||
		msg.includes('sudah kedaluwarsa') ||
		msg.includes('kedaluwarsa') ||
		msg.includes('jwt expired') ||
		msg.includes('invalid token') ||
		msg.includes('unauthorized') ||
		msg.includes('token expired')
	);
}
