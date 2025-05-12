<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Cog } from '@lucide/svelte';
	import type { PageData } from '../$types';
	import { settingsStore } from '$lib/stores/settings-store';

	let { data } = $props<{ data: PageData }>();

	$effect(() => {
		if (data.settings) {
			settingsStore.update((current) => ({
				...current,
				...data.settings
			}));
		}
	});
</script>

<div class="grid auto-cols-auto lg:auto-cols-auto gap-6">
	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-primary/10 p-2 rounded-full">
					<Cog class="h-5 w-5 text-primary" />
				</div>
				<div>
					<Card.Title>Core Arcane Configuration</Card.Title>
					<Card.Description>Essential settings for how Arcane operates.</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="space-y-6">
				<div class="space-y-2">
					<label for="stacksDirectory" class="text-sm font-medium block mb-1.5">Stack Projects Directory</label>
					<Input type="text" id="stacksDirectory" name="stacksDirectory" bind:value={$settingsStore.stacksDirectory} placeholder="/opt/arcane/stacks" required />
					<p class="text-xs text-muted-foreground">The primary folder where Arcane will store and manage your Docker Compose stack projects. This path is inside Arcane's container.</p>
					<p class="text-xs font-bold text-destructive">Important: Changing this path will not automatically move existing stack projects.</p>
				</div>

				<div class="space-y-2">
					<label for="baseServerUrl" class="text-sm font-medium block mb-1.5">Default Service Access URL</label>
					<Input type="text" id="baseServerUrl" name="baseServerUrl" bind:value={$settingsStore.baseServerUrl} placeholder="localhost" />
					<p class="text-xs text-muted-foreground">When Arcane provides links to your services (e.g., web UIs), this URL (like 'localhost' or an IP address) is used as the default. This is primarily for services not on directly accessible networks (e.g., macvlan).</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
