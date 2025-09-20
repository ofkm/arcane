<script lang="ts">
	import settingsStore from '$lib/stores/config-store';
	import Button from '$lib/components/ui/button/button.svelte';
	import XIcon from '@lucide/svelte/icons/x';

	let dismissed = $state(false);
	const active = $derived.by(() => $settingsStore.uiConfigDisabled && !dismissed);
	function dismiss() {
		dismissed = true;
	}
</script>

{#if active}
	<div class="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
		<div
			role="alert"
			class="fade-slide-down pointer-events-auto mx-2 mt-2 w-full max-w-3xl rounded-md border border-amber-300 bg-amber-50/95 px-4 py-3 text-amber-900 shadow-lg backdrop-blur dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-100"
		>
			<div class="flex items-start gap-3">
				<div class="mt-0.5">
					<div class="size-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/30"></div>
				</div>
				<div class="flex-1 space-y-1">
					<p class="text-sm font-medium">UI configuration is disabled</p>
					<p class="text-xs leading-relaxed">Settings must be managed via environment variables.</p>
				</div>
				<Button
					type="button"
					onclick={dismiss}
					variant="ghost"
					class="rounded-sm p-1 text-amber-600 hover:bg-amber-200/60 hover:text-amber-800 dark:text-amber-200 dark:hover:bg-amber-800/70 dark:hover:text-amber-50"
					aria-label="Dismiss notice"
				>
					<XIcon class="size-4" />
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-slide-down {
		0% {
			opacity: 0;
			transform: translateY(-14px) scale(0.98);
			filter: blur(2px);
		}
		60% {
			opacity: 1;
			transform: translateY(2px) scale(1);
			filter: blur(0);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.fade-slide-down {
		animation: fade-slide-down 360ms cubic-bezier(0.32, 0.72, 0.28, 0.99);
		will-change: transform, opacity, filter;
	}
</style>
