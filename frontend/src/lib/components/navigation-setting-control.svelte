<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ServerIcon from '@lucide/svelte/icons/server';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import XIcon from '@lucide/svelte/icons/x';

	let {
		id,
		label,
		description,
		icon: Icon,
		serverValue,
		localOverride,
		onServerChange,
		onLocalOverride,
		onClearOverride,
		serverDisabled = false
	}: {
		id: string;
		label: string;
		description: string;
		icon: any;
		serverValue: boolean;
		localOverride?: boolean;
		onServerChange: (value: boolean) => void;
		onLocalOverride: (value: boolean) => void;
		onClearOverride: () => void;
		serverDisabled?: boolean;
	} = $props();

	const effectiveValue = $derived(localOverride !== undefined ? localOverride : serverValue);
	const hasOverride = $derived(localOverride !== undefined);
</script>

<div class={`border rounded-lg p-3 sm:p-4 h-full flex flex-col ${hasOverride ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20' : 'border-border'}`}>
	<div class="flex flex-col h-full space-y-3">
		<!-- Header with icon, title and clear button -->
		<div class="flex items-start gap-3">
			<div class={`flex size-7 sm:size-8 items-center justify-center rounded-lg ring-1 flex-shrink-0 ${hasOverride ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20' : 'bg-primary/10 text-primary ring-primary/20'}`}>
				<Icon class="size-3 sm:size-4" />
			</div>
			
			<div class="flex-1 min-w-0">
				<div class="flex items-start justify-between gap-2 mb-1">
					<div class="min-w-0 flex-1">
						<h4 class="font-medium text-sm leading-tight">{label}</h4>
					</div>
					
					{#if hasOverride}
						<Button 
							variant="ghost" 
							size="sm" 
							onclick={onClearOverride}
							class="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex-shrink-0"
							title="Clear local override"
						>
							<XIcon class="size-3" />
						</Button>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground leading-relaxed">{description}</p>
			</div>
		</div>

		<!-- Settings Controls -->
		<div class="flex-1 flex flex-col justify-end space-y-2 sm:space-y-3">
			<!-- Server Setting -->
			<div class="bg-background/50 border rounded-md">
				<div class="flex items-center justify-between p-2 sm:p-3">
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<ServerIcon class="size-3 sm:size-4 text-muted-foreground flex-shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium leading-tight">Server Default</p>
							<p class="text-xs text-muted-foreground leading-tight hidden sm:block">Applies to all users</p>
						</div>
					</div>
					
					<div class="flex gap-1 flex-shrink-0">
						<Button
							variant={!serverValue ? 'default' : 'outline'}
							size="sm"
							onclick={() => !serverDisabled && onServerChange(false)}
							disabled={serverDisabled}
							class="text-xs px-2 sm:px-3 h-7 sm:h-8 min-w-[2.5rem]"
						>
							OFF
						</Button>
						<Button
							variant={serverValue ? 'default' : 'outline'}
							size="sm"
							onclick={() => !serverDisabled && onServerChange(true)}
							disabled={serverDisabled}
							class="text-xs px-2 sm:px-3 h-7 sm:h-8 min-w-[2.5rem]"
						>
							ON
						</Button>
					</div>
				</div>
			</div>

			<!-- Local Override -->
			<div class={`border rounded-md ${hasOverride ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' : 'bg-muted/30 border-border'}`}>
				<div class="flex items-center justify-between p-2 sm:p-3">
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<SmartphoneIcon class="size-3 sm:size-4 text-muted-foreground flex-shrink-0" />
						<div class="min-w-0 flex-1">
							<div class="flex flex-col sm:flex-row sm:items-center sm:gap-1">
								<p class="text-xs font-medium leading-tight">This Device</p>
								{#if hasOverride}
									<span class="text-xs text-orange-600 dark:text-orange-400 leading-tight">(Override)</span>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground leading-tight hidden sm:block">
								{hasOverride ? 'Overriding server default' : 'Using server default'}
							</p>
						</div>
					</div>
					
					{#if hasOverride}
						<div class="flex gap-1 flex-shrink-0">
							<Button
								variant={!localOverride ? 'default' : 'outline'}
								size="sm"
								onclick={() => onLocalOverride(false)}
								class="text-xs px-2 sm:px-3 h-7 sm:h-8 min-w-[2.5rem]"
							>
								OFF
							</Button>
							<Button
								variant={localOverride ? 'default' : 'outline'}
								size="sm"
								onclick={() => onLocalOverride(true)}
								class="text-xs px-2 sm:px-3 h-7 sm:h-8 min-w-[2.5rem]"
							>
								ON
							</Button>
						</div>
					{:else}
						<div class="flex items-center gap-2 flex-shrink-0">
							<span class="text-xs text-muted-foreground font-medium hidden sm:inline">
								{effectiveValue ? 'ON' : 'OFF'}
							</span>
							<Button 
								variant="outline" 
								size="sm" 
								onclick={() => onLocalOverride(!effectiveValue)}
								class="h-6 sm:h-7 text-xs px-2"
							>
								Override
							</Button>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Current State Summary -->
		<div class="bg-muted/30 border rounded-md p-2">
			<div class="flex items-center justify-between gap-2">
				<span class="text-xs font-medium text-muted-foreground">Current State:</span>
				<div class="flex items-center gap-1 flex-wrap justify-end">
					<span class={`text-xs font-medium ${effectiveValue ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
						{effectiveValue ? 'ON' : 'OFF'}
					</span>
					<span class="text-xs text-muted-foreground">
						({hasOverride ? 'Local Override' : 'Server Default'})
					</span>
				</div>
			</div>
		</div>
	</div>
</div>
