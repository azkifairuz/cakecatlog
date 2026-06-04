<script>
	import { enhance } from '$app/forms';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';

	let { data, form } = $props();
	let isCreating = $state(false);

	let primaryPreview = $state(null);
	let sub1Preview = $state(null);
	let sub2Preview = $state(null);
	let sub3Preview = $state(null);

	function handleFileChange(event, type) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				if (type === 'primary') primaryPreview = e.target.result;
				if (type === 'sub1') sub1Preview = e.target.result;
				if (type === 'sub2') sub2Preview = e.target.result;
				if (type === 'sub3') sub3Preview = e.target.result;
			};
			reader.readAsDataURL(file);
		} else {
			if (type === 'primary') primaryPreview = null;
			if (type === 'sub1') sub1Preview = null;
			if (type === 'sub2') sub2Preview = null;
			if (type === 'sub3') sub3Preview = null;
		}
	}

	function formatCurrency(amount) {
		if (!amount) return '-';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}
</script>

<div class="flex items-center justify-between mb-4">
	<h1 class="text-lg font-semibold md:text-2xl">Products</h1>
	<Button onclick={() => isCreating = !isCreating}>
		{isCreating ? 'Cancel' : 'Add New Product'}
	</Button>
</div>

{#if form?.error}
	<div class="p-4 bg-destructive/15 text-destructive font-medium text-sm mb-4 rounded-md">
		Error: {form.error}
	</div>
{/if}

{#if isCreating}
	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title>Add New Product</Card.Title>
			<Card.Description>Fill in the details to add a new cake to your catalog.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/createProduct" enctype="multipart/form-data" use:enhance={() => {
				return async ({ update }) => {
					await update();
					isCreating = false;
					primaryPreview = null;
					sub1Preview = null;
					sub2Preview = null;
					sub3Preview = null;
				};
			}} class="grid gap-4 md:grid-cols-2">
				
				<div class="grid gap-2">
					<Label for="name">Product Name *</Label>
					<Input id="name" name="name" required />
				</div>
				
				<div class="grid gap-2 md:col-span-2">
					<Label for="category_id">Category</Label>
					<select id="category_id" name="category_id" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
						<option value="">-- No Category --</option>
						{#each data.categories as category}
							<option value={category.id}>{category.name}</option>
						{/each}
					</select>
				</div>
				
				<div class="grid gap-2">
					<Label for="base_price">Base Price (Rp) *</Label>
					<Input id="base_price" name="base_price" type="number" required />
				</div>
				
				<div class="grid gap-2 md:col-span-2">
					<Label for="description">Description</Label>
					<Textarea id="description" name="description" rows="3" />
				</div>
				
				<div class="grid gap-2 md:col-span-2">
					<Label>Product Images</Label>
					<div class="grid grid-cols-3 gap-4">
						<!-- Primary Image Box -->
						<div class="col-span-3">
							<Label for="primary_image" class="relative overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer rounded-xl flex flex-col items-center justify-center h-48 bg-muted/20 transition-colors">
								{#if primaryPreview}
									<img src={primaryPreview} alt="Preview" class="w-full h-full object-cover" />
								{:else}
									<span class="text-muted-foreground text-sm font-medium">Click to upload Primary Image</span>
									<span class="text-muted-foreground/70 text-xs mt-1">Recommended: Square, min 800x800px</span>
								{/if}
								<Input id="primary_image" name="images" type="file" accept="image/*" class="hidden" onchange={(e) => handleFileChange(e, 'primary')} />
							</Label>
						</div>
						
						<!-- Sub Image Boxes -->
						<div class="col-span-1">
							<Label for="sub_image_1" class="relative overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer rounded-xl flex flex-col items-center justify-center h-24 bg-muted/20 transition-colors">
								{#if sub1Preview}
									<img src={sub1Preview} alt="Preview" class="w-full h-full object-cover" />
								{:else}
									<span class="text-muted-foreground text-xs font-medium text-center px-2">Upload Sub 1</span>
								{/if}
								<Input id="sub_image_1" name="images" type="file" accept="image/*" class="hidden" onchange={(e) => handleFileChange(e, 'sub1')} />
							</Label>
						</div>
						<div class="col-span-1">
							<Label for="sub_image_2" class="relative overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer rounded-xl flex flex-col items-center justify-center h-24 bg-muted/20 transition-colors">
								{#if sub2Preview}
									<img src={sub2Preview} alt="Preview" class="w-full h-full object-cover" />
								{:else}
									<span class="text-muted-foreground text-xs font-medium text-center px-2">Upload Sub 2</span>
								{/if}
								<Input id="sub_image_2" name="images" type="file" accept="image/*" class="hidden" onchange={(e) => handleFileChange(e, 'sub2')} />
							</Label>
						</div>
						<div class="col-span-1">
							<Label for="sub_image_3" class="relative overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer rounded-xl flex flex-col items-center justify-center h-24 bg-muted/20 transition-colors">
								{#if sub3Preview}
									<img src={sub3Preview} alt="Preview" class="w-full h-full object-cover" />
								{:else}
									<span class="text-muted-foreground text-xs font-medium text-center px-2">Upload Sub 3</span>
								{/if}
								<Input id="sub_image_3" name="images" type="file" accept="image/*" class="hidden" onchange={(e) => handleFileChange(e, 'sub3')} />
							</Label>
						</div>
					</div>
					<p class="text-xs text-muted-foreground mt-1">First uploaded image will be treated as primary.</p>
				</div>
				
				<div class="flex items-center gap-2 md:col-span-2 mt-2">
					<input type="checkbox" id="is_available" name="is_available" checked class="rounded border-gray-300" />
					<Label for="is_available">Available for order</Label>
				</div>
				
				<div class="md:col-span-2 mt-4">
					<Button type="submit" class="w-full md:w-auto">Save Product</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
{/if}

<div class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
	<div class="overflow-x-auto">
		<Table.Root class="min-w-[700px]">
			<Table.Header>
			<Table.Row>
				<Table.Head class="w-[80px]">Image</Table.Head>
				<Table.Head>Name & Category</Table.Head>
				<Table.Head>Price</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.products as product (product.id)}
				<Table.Row>
					<Table.Cell>
						{#if product.product_images && product.product_images.length > 0}
							{@const primaryImg = product.product_images.find(img => img.is_primary) || product.product_images[0]}
							<div class="w-12 h-12 rounded overflow-hidden bg-muted">
								<img src={primaryImg.image_url} alt={product.name} class="w-full h-full object-cover" />
							</div>
						{:else}
							<div class="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
								No Img
							</div>
						{/if}
					</Table.Cell>
					<Table.Cell>
						<div class="font-medium text-[#4A3B32]">{product.name}</div>
						{#if product.category}
							<Badge variant="outline" class="mt-1 text-[10px] bg-slate-50">{product.category.name}</Badge>
						{/if}
						<div class="text-xs text-muted-foreground line-clamp-1 max-w-[200px] mt-1">{product.description || '-'}</div>
					</Table.Cell>
					<Table.Cell>
						{formatCurrency(product.base_price)}
					</Table.Cell>
					<Table.Cell>
						<form method="POST" action="?/toggleAvailability" use:enhance>
							<input type="hidden" name="id" value={product.id} />
							<input type="hidden" name="is_available" value={product.is_available.toString()} />
							<button type="submit">
								{#if product.is_available}
									<Badge variant="default" class="bg-green-500 hover:bg-green-600">Available</Badge>
								{:else}
									<Badge variant="secondary">Unavailable</Badge>
								{/if}
							</button>
						</form>
					</Table.Cell>
					<Table.Cell class="text-right">
						<form method="POST" action="?/deleteProduct" use:enhance onsubmit={(e) => {
							if(!confirm('Are you sure you want to delete this product?')) e.preventDefault();
						}}>
							<input type="hidden" name="id" value={product.id} />
							<Button type="submit" variant="destructive" size="sm">Delete</Button>
						</form>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan="5" class="text-center py-6 text-muted-foreground">
						No products found. Start by adding one.
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
		</Table.Root>
	</div>
</div>
