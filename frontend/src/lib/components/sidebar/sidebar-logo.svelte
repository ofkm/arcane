<script lang="ts">
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import { cn } from '$lib/utils';
	import { m } from '$lib/paraglide/messages';
	import { getApplicationLogo } from '$lib/utils/image.util';

	let { isCollapsed, versionInformation }: { isCollapsed: boolean; versionInformation: AppVersionInformation } = $props();
</script>

<div
	class={cn(
		'border-border/30 flex h-16 items-center border-b transition-all duration-300',
		isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
	)}
>
	<div class="relative flex shrink-0 items-center justify-center">
		<div
			class={cn('flex items-center justify-center font-semibold transition-all duration-300', isCollapsed ? 'size-8' : 'size-10')}
		>
			<img
				src={getApplicationLogo()}
				alt={m.layout_title()}
				class={cn('drop-shadow-sm transition-all duration-300', isCollapsed ? 'size-5' : 'size-7')}
				width={isCollapsed ? '20' : '28'}
				height={isCollapsed ? '20' : '28'}
			/>
		</div>
	</div>
	{#if !isCollapsed}
		<div class="flex min-w-0 flex-col justify-center">
			<span
				class="from-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-lg font-bold leading-none tracking-tight text-transparent"
				>{m.layout_title()}</span
			>
			<span class="text-muted-foreground/80 text-xs font-medium">
				{m.sidebar_version({ version: versionInformation?.currentVersion ?? m.common_unknown() })}
			</span>
		</div>
	{/if}
</div>
