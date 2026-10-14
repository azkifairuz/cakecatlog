<script>
 import PrintableInvoice from '$lib/components/PrintableInvoice.svelte';
 let { data } = $props();
</script>
<PrintableInvoice invoice={data.invoice} />
