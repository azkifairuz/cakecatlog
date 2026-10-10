<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { setAdminToken } from '$lib/api/auth.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Admin Login | dessertbyfir</title>
</svelte:head>

<div class="flex items-center justify-center min-h-screen bg-muted/40 p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Admin Login</Card.Title>
			<Card.Description>Enter your credentials to access the dashboard.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if form?.error}
				<div class="bg-destructive/15 text-destructive p-3 rounded-md mb-4 text-sm">
					{form.error}
				</div>
			{/if}
			
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.accessToken) {
							setAdminToken(result.data.accessToken);
							await goto('/admin/dashboard');
							return;
						}
						await update();
						loading = false;
					};
				}}
				class="grid gap-4"
			>
				<div class="grid gap-2">
					<Label for="email">Email Atau Username</Label>
					<Input
						id="email"
						name="email"
						type="text"
						placeholder="admin@example.com"
						value={form?.email ?? ''}
						required
					/>
				</div>
				<div class="grid gap-2">
					<Label for="password">Password</Label>
					<Input id="password" name="password" type="password" required />
				</div>
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Logging in...' : 'Login'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
