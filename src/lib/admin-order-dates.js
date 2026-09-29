function shiftDate(dateString, days) {
	const date = new Date(`${dateString}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function getDashboardDateRange(mode, today, customStart = today, customEnd = today) {
	if (mode === 'all') return { start: '', end: '' };
	if (mode === 'weekly') return { start: shiftDate(today, -6), end: today };
	if (mode === 'monthly') return { start: shiftDate(today, -29), end: today };
	if (mode === 'range') return { start: customStart, end: customEnd };
	if (mode === 'daily') return { start: today, end: today };
	return { start: '', end: '' };
}
