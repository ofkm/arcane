<script lang="ts">
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import { cn } from '$lib/utils';
	import { m } from '$lib/paraglide/messages';
	import { getApplicationLogo } from '$lib/utils/image.util';
	import settingsStore from '$lib/stores/config-store';

	let { isCollapsed, versionInformation }: { isCollapsed: boolean; versionInformation: AppVersionInformation } = $props();

	// Make logo URL reactive to accent color changes
	let logoUrl = $derived(getApplicationLogo(!isCollapsed));
</script>

<div
	class={cn(
		'border-border/30 flex border-b transition-all duration-300',
		isCollapsed ? 'h-16 items-center justify-center px-2' : 'h-14 items-center justify-center px-4'
	)}
>
	<div
		class={cn('relative flex shrink-0 items-center justify-center transition-all duration-300', isCollapsed ? '' : 'flex-col')}
	>
		<img
			src={logoUrl}
			alt={m.layout_title()}
			class={cn('drop-shadow-sm transition-all duration-300', isCollapsed ? 'h-6 w-6' : 'h-9 w-auto max-w-[160px]')}
			width={isCollapsed ? '24' : '160'}
			height={isCollapsed ? '24' : '72'}
		/>
	</div>
</div>
