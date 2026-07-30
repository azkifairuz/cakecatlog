<script>
	import { Badge } from '$lib/components/ui/badge';

	let { status, label = status } = $props();
	let variant = $derived(
		['Batal/Refund', 'error', 'disconnected', 'inactive'].includes(status)
			? 'destructive'
			: ['Pending', 'warning', 'pickup'].includes(status)
				? 'outline'
				: ['Diproses', 'delivery'].includes(status)
					? 'secondary'
					: 'default'
	);
</script>

<Badge {variant}>{label}</Badge>
