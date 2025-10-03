<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import SearchIcon from '@lucide/svelte/icons/search';
	import KeyIcon from '@lucide/svelte/icons/key';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import settingsStore from '$lib/stores/config-store';
	import { ResourcePageLayout, type ActionButton } from '$lib/layouts/index.js';
	import { globalVariablesService } from '$lib/services/variable-service.js';
	import type { Variable } from '$lib/types/variable.type';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();
	let envVars = $state<Variable[]>([...data.variables]);
	let originalVars = $state<Variable[]>([...data.variables]);
	let searchQuery = $state('');
	let isLoading = $state(false);

	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);

	const filteredVars = $derived.by(() => {
		if (!searchQuery.trim()) return envVars;

		const query = searchQuery.toLowerCase();
		return envVars.filter((v) => v.key.toLowerCase().includes(query) || v.value.toLowerCase().includes(query));
	});

	const hasChanges = $derived.by(() => {
		if (envVars.length !== originalVars.length) return true;

		const originalMap = new Map(originalVars.map((v) => [v.key, v.value]));

		for (const v of envVars) {
			if (!v.key.trim()) continue;

			const originalValue = originalMap.get(v.key);
			if (originalValue !== v.value) return true;
			if (originalValue === undefined) return true;
		}

		const currentMap = new Map(envVars.filter((v) => v.key.trim()).map((v) => [v.key, v.value]));
		for (const key of originalMap.keys()) {
			if (!currentMap.has(key)) return true;
		}

		return false;
	});

	function addEnvVar() {
		envVars = [{ key: '', value: '' }, ...envVars];
	}

	function removeEnvVar(index: number) {
		envVars = envVars.filter((_, i) => i !== index);
	}

	function duplicateEnvVar(index: number) {
		const varToDuplicate = envVars[index];
		let baseKey = varToDuplicate.key;
		let counter = 1;
		
		// Check if key already ends with _# pattern
		const match = baseKey.match(/^(.+)_(\d+)$/);
		if (match) {
			baseKey = match[1];
			counter = parseInt(match[2], 10) + 1;
		}
		
		let newKey = `${baseKey}_${counter}`;
		
		// Find next available number
		while (envVars.some((v) => v.key === newKey)) {
			counter++;
			newKey = `${baseKey}_${counter}`;
		}
		
		const newVar = {
			key: newKey,
			value: varToDuplicate.value
		};
		envVars = [...envVars.slice(0, index + 1), newVar, ...envVars.slice(index + 1)];
	}

	async function onSubmit() {
		isLoading = true;

		try {
			const validVars = envVars
				.filter((v) => v.key.trim() !== '')
				.map((v) => ({
					key: v.key.trim(),
					value: v.value.trim()
				}));

			const keys = validVars.map((v) => v.key);
			const uniqueKeys = new Set(keys);
			if (keys.length !== uniqueKeys.size) {
				toast.error('Duplicate keys found. Please ensure all keys are unique.');
				return;
			}

			await globalVariablesService.updateGlobalVariables(validVars);

			originalVars = [...validVars];
			envVars = [...validVars];

			toast.success('Global variables saved successfully');
		} catch (error) {
			console.error('Failed to save global environment variables:', error);
			toast.error('Failed to save. Please try again.');
		} finally {
			isLoading = false;
		}
	}

	function resetForm() {
		envVars = [...originalVars];
		searchQuery = '';
	}

	function handleKeyDown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addEnvVar();
		}
	}

	$effect(() => {
		if (envVars.length === 0) {
			addEnvVar();
		}
	});

	const actionButtons = $derived<ActionButton[]>([
		{
			id: 'reset',
			action: 'restart',
			label: m.common_reset(),
			onclick: resetForm,
			disabled: !hasChanges || isLoading
		},
		{
			id: 'save',
			action: 'save',
			label: m.common_save(),
			loadingLabel: m.common_saving(),
			loading: isLoading,
			disabled: isLoading || !hasChanges,
			onclick: onSubmit
		}
	]);
</script>

<ResourcePageLayout
	title="Global Variables"
	subtitle="Manage global environment variables that are available to all projects"
	{actionButtons}
>
	{#snippet mainContent()}
		<fieldset disabled={isReadOnly} class="relative">
			<div class="space-y-4 sm:space-y-6">
				<Card.Root class="border-primary/20 bg-primary/5 overflow-hidden pt-0">
					<Card.Content class="px-3 py-4 sm:px-6">
						<div class="flex items-start gap-3">
							<div class="text-primary mt-0.5 shrink-0">
								<AlertCircleIcon class="size-5" />
							</div>
							<div class="space-y-1 text-sm">
								<p class="text-foreground font-medium">About Global Environment Variables</p>
								<p class="text-muted-foreground">
									These variables are stored in <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs"
										>.env.global</code
									>
									at the root of your projects directory and are available to all Docker Compose projects.
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="overflow-hidden pt-0">
					<Card.Header class="bg-muted/20 sticky top-0 z-10 border-b !py-3">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="flex items-center gap-3">
								<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
									<KeyIcon class="size-4" />
								</div>
								<div>
									<Card.Title class="text-base">Environment Variables</Card.Title>
									<Card.Description class="text-xs">
										{envVars.filter((v) => v.key.trim()).length} variable{envVars.filter((v) => v.key.trim()).length !== 1
											? 's'
											: ''} configured
									</Card.Description>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<div class="relative w-full sm:w-52">
									<SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
									<Input type="text" placeholder="Search..." bind:value={searchQuery} class="h-9 pl-10" />
								</div>
								<Button type="button" size="sm" onclick={addEnvVar} disabled={isLoading} class="shrink-0">
									<PlusIcon class="mr-1.5 size-4" />
									Add
								</Button>
							</div>
						</div>
					</Card.Header>

					<Card.Content class="px-3 py-4 sm:px-6">
						{#if filteredVars.length === 0 && searchQuery.trim()}
							<div class="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
								<SearchIcon class="mb-3 size-12 opacity-20" />
								<p class="text-sm font-medium">No variables found</p>
								<p class="text-xs">Try a different search term</p>
							</div>
						{:else if filteredVars.length === 0}
							<div class="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
								<KeyIcon class="mb-3 size-12 opacity-20" />
								<p class="text-sm font-medium">No environment variables yet</p>
								<p class="text-xs">Click "Add" to create your first variable</p>
							</div>
						{:else}
							<div class="space-y-2">
								{#each filteredVars as envVar, index (index)}
									{@const actualIndex = envVars.indexOf(envVar)}
									<div
										class="bg-muted/30 hover:bg-muted/50 group flex flex-col gap-2 rounded-lg border p-2.5 transition-colors sm:flex-row sm:items-center"
									>
										<div class="flex flex-1 gap-2">
											<Input
												type="text"
												placeholder="KEY"
												bind:value={envVar.key}
												disabled={isLoading}
												class="h-9 flex-1 font-mono text-sm sm:max-w-[200px]"
												onkeydown={(e) => handleKeyDown(e, actualIndex)}
												oninput={(e) => {
													const target = e.target as HTMLInputElement;
													const cursorPos = target.selectionStart || 0;
													const oldValue = envVar.key;
													const newValue = target.value.toUpperCase().replace(/\s/g, '_');
													
													envVar.key = newValue;
													
													// Restore cursor position after transformation
													requestAnimationFrame(() => {
														const diff = newValue.length - oldValue.length;
														target.setSelectionRange(cursorPos + diff, cursorPos + diff);
													});
												}}
											/>
											<span class="text-muted-foreground flex items-center font-mono text-sm">=</span>
											<Input
												type="text"
												placeholder="value"
												bind:value={envVar.value}
												disabled={isLoading}
												class="h-9 flex-[2] font-mono text-sm"
												onkeydown={(e) => handleKeyDown(e, actualIndex)}
											/>
										</div>
										<div class="flex items-center gap-1 self-end sm:self-center">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												class="size-8 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
												onclick={() => duplicateEnvVar(actualIndex)}
												disabled={isLoading}
												title="Duplicate"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													class="lucide lucide-copy"
												>
													<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
													<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
												</svg>
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												class="text-destructive hover:text-destructive hover:bg-destructive/10 size-8 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
												onclick={() => removeEnvVar(actualIndex)}
												disabled={isLoading}
												title="Remove"
											>
												<XIcon class="size-4" />
											</Button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</fieldset>
	{/snippet}
</ResourcePageLayout>
