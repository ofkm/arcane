<script lang="ts">
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import { cn } from '$lib/utils';

	let {
		isCollapsed,
		versionInformation
	}: { isCollapsed: boolean; versionInformation: AppVersionInformation } = $props();
</script>

<div
	class={cn(
		'border-border/30 flex h-16 items-center border-b transition-all duration-300',
		isCollapsed ? 'justify-center px-2' : 'gap-3 px-6'
	)}
>
	<div class="relative flex shrink-0 items-center justify-center">
		<div
			class={cn(
				'from-primary/20 to-primary/10 text-primary border-primary/20 flex items-center justify-center rounded-full border bg-gradient-to-br font-semibold transition-all duration-300',
				isCollapsed ? 'size-8' : 'size-10'
			)}
		>
			<img
				src="/img/arcane.svg"
				alt="Arcane"
				class={cn('drop-shadow-sm transition-all duration-300', isCollapsed ? 'size-5' : 'size-7')}
				width={isCollapsed ? '20' : '28'}
				height={isCollapsed ? '20' : '28'}
			/>
		</div>
		<div
			class={cn(
				'bg-primary/10 absolute inset-0 rounded-full opacity-60 blur-xl transition-all duration-300',
				isCollapsed ? 'scale-75' : 'scale-100'
			)}
		></div>
	</div>
	{#if !isCollapsed}
		<div class="flex min-w-0 flex-col justify-center">
			<span
				class="from-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-lg leading-none font-bold tracking-tight text-transparent"
				>Arcane</span
			>
			<span class="text-muted-foreground/80 text-xs font-medium">
				v{versionInformation?.currentVersion}
			</span>
		</div>
	{/if}
</div>
