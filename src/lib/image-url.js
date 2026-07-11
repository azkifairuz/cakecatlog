const SUPABASE_PUBLIC_STORAGE_SEGMENT = '/storage/v1/object/public/';
const SUPABASE_RENDER_STORAGE_SEGMENT = '/storage/v1/render/image/public/';

export function getImageUrl(url, options = {}) {
	if (!url) return url;

	const params = buildImageParams(options);
	if (Object.keys(params).length === 0) return url;

	try {
		const parsed = new URL(url);

		if (isSupabasePublicStorageUrl(parsed)) {
			parsed.pathname = parsed.pathname.replace(
				SUPABASE_PUBLIC_STORAGE_SEGMENT,
				SUPABASE_RENDER_STORAGE_SEGMENT
			);
			setSearchParams(parsed, params);
			return parsed.toString();
		}

		setSearchParams(parsed, params);
		return parsed.toString();
	} catch {
		return url;
	}
}

function buildImageParams({ width, height, quality, resize, format } = {}) {
	const params = {};

	if (width) params.width = width;
	if (height) params.height = height;
	if (quality) params.quality = quality;
	if (resize) params.resize = resize;
	if (format) params.format = format;

	return params;
}

function isSupabasePublicStorageUrl(url) {
	return url.pathname.includes(SUPABASE_PUBLIC_STORAGE_SEGMENT);
}

function setSearchParams(url, params) {
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, String(value));
	}
}
