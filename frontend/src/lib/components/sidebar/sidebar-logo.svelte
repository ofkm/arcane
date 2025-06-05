<script lang="ts">
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import { cn } from '$lib/utils';

	let { isCollapsed, versionInformation }: { isCollapsed: boolean; versionInformation: AppVersionInformation } = $props();
</script>

<div class={cn('flex items-center h-16 transition-all duration-300 border-b border-border/30', isCollapsed ? 'justify-center px-2' : 'gap-3 px-6')}>
	<div class="shrink-0 flex items-center justify-center relative">
		<div class={cn('rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center font-semibold border border-primary/20 transition-all duration-300', isCollapsed ? 'size-8' : 'size-10')}>
			<img src="/img/arcane.svg" alt="Arcane" class={cn('transition-all duration-300 drop-shadow-sm', isCollapsed ? 'size-5' : 'size-7')} width={isCollapsed ? '20' : '28'} height={isCollapsed ? '20' : '28'} />
		</div>
		<div class={cn('absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-60 transition-all duration-300', isCollapsed ? 'scale-75' : 'scale-100')}></div>
	</div>
	{#if !isCollapsed}
		<div class="flex flex-col justify-center min-w-0">
			<span class="text-lg font-bold tracking-tight leading-none bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Arcane</span>
			<span class="text-xs text-muted-foreground/80 font-medium">
				v{versionInformation?.currentVersion}
			</span>
		</div>
	{/if}
</div>
