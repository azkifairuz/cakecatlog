<script>
	import { getI18n } from '$lib/i18n.svelte.js';

	let { href = '', label } = $props();
	const i18n = getI18n();
	let displayLabel = $derived(label || i18n?.t('nav.chatWhatsapp') || 'Chat WhatsApp');
</script>

{#if href}
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		aria-label={displayLabel}
		class="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 group flex items-center bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full p-3.5 sm:p-4 shadow-lg shadow-[#25D366]/35 hover:shadow-xl hover:shadow-[#25D366]/50 active:scale-95 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
	>
		<!-- WhatsApp SVG Icon -->
		<svg
			class="w-6 h-6 sm:w-7 sm:h-7 fill-current shrink-0 transition-transform duration-300 group-hover:scale-110"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<path
				d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.275-.1-.476-.15-.676.15-.201.3-.777.978-.952 1.179-.175.2-.351.226-.652.075-.3-.15-1.268-.468-2.416-1.492-.893-.797-1.496-1.782-1.672-2.083-.175-.301-.019-.464.132-.614.135-.135.301-.351.451-.527.151-.175.201-.301.301-.501.101-.2.05-.376-.025-.526-.075-.15-.676-1.63-.927-2.232-.244-.587-.492-.507-.676-.517-.175-.008-.376-.01-.577-.01-.201 0-.527.075-.803.376-.275.301-1.053 1.028-1.053 2.508 0 1.48 1.078 2.909 1.229 3.11.15.2 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.635.722.23 1.38.197 1.9.12.58-.087 1.78-.728 2.03-1.431.251-.703.251-1.305.176-1.431-.076-.126-.276-.201-.577-.351zM12.042 21.928h-.002c-1.745 0-3.457-.468-4.962-1.353l-.356-.21-3.69 1.196 1.225-3.593-.232-.369a9.882 9.882 0 0 1-1.517-5.263C2.508 6.84 6.786 2.562 12.044 2.562c2.545 0 4.939.992 6.74 2.793a9.479 9.479 0 0 1 2.788 6.738c-.003 5.497-4.28 9.835-9.53 9.835zm8.016-16.398A11.314 11.314 0 0 0 12.04 2.2c-6.24 0-11.319 5.076-11.321 11.318 0 1.993.521 3.94 1.51 5.655L.5 24l4.962-1.616a11.272 11.272 0 0 0 5.578 1.474h.005c6.239 0 11.319-5.077 11.321-11.319 0-3.023-1.177-5.865-3.308-7.999z"
			/>
		</svg>

		<!-- Smooth expand label on desktop hover -->
		<span
			class="max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold tracking-wide opacity-0 transition-all duration-300 ease-out group-hover:max-w-xs group-hover:opacity-100 group-hover:pl-2 group-hover:pr-1 hidden sm:inline-block"
		>
			{displayLabel}
		</span>
	</a>
{/if}
