<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import Terminal from '$lib/components/terminal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { get } from 'svelte/store';
	import { environmentStore } from '$lib/stores/environment.store';

	let {
		containerId
	}: {
		containerId: string | undefined;
	} = $props();

	let isConnected = $state(false);
	let websocketUrl = $state('');
	let selectedShell = $state('/bin/sh');

	$effect(() => {
		if (containerId) {
			const currentEnv = get(environmentStore);
			const envId = currentEnv?.id || 'local';
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = window.location.host;
			websocketUrl = `${protocol}//${host}/api/environments/${envId}/containers/${containerId}/exec/ws?shell=${encodeURIComponent(selectedShell)}`;
		}
	});

	function handleConnected() {
		isConnected = true;
	}

	function handleDisconnected() {
		isConnected = false;
	}
</script>

<Card.Root class="gap-0 p-0">
	<Card.Header class="bg-muted rounded-t-xl p-4">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2">
				<TerminalIcon class="text-primary size-5" />
				<Card.Title class="text-lg">
					<h2>Shell</h2>
				</Card.Title>
				{#if isConnected}
					<div class="flex items-center gap-2">
						<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
						<span class="text-xs font-semibold text-green-600 sm:text-sm">{m.common_live()}</span>
					</div>
				{/if}
			</div>
		</div>
		<Card.Description>Interactive shell access to container</Card.Description>
	</Card.Header>
	<Card.Content class="h-[600px] p-0">
		{#if websocketUrl}
			<Terminal {websocketUrl} onConnected={handleConnected} onDisconnected={handleDisconnected} />
		{/if}
	</Card.Content>
</Card.Root>
