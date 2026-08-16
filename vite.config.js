import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		warmup: {
			clientFiles: [
				'./src/routes/+layout.svelte',
				'./src/routes/+page.svelte',
				'./src/routes/admin/dashboard/+layout.svelte',
				'./src/routes/admin/dashboard/+page.svelte'
			],
			ssrFiles: [
				'./src/hooks.server.js',
				'./src/routes/+layout.server.js',
				'./src/routes/+layout.svelte',
				'./src/routes/+page.server.js',
				'./src/routes/+page.svelte',
				'./src/routes/admin/dashboard/+layout.svelte',
				'./src/routes/admin/dashboard/+page.server.js',
				'./src/routes/admin/dashboard/+page.svelte'
			]
		}
	}
});
