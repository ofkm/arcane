<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import Terminal from '$lib/components/terminal/terminal.svelte';
	import TerminalHeader from '$lib/components/terminal/terminal-header.svelte';
	import { m } from '$lib/paraglide/messages';
	import { environmentStore } from '$lib/stores/environment.store';
	import settingsStore from '$lib/stores/config-store';

	let {
		containerId
	}: {
		containerId: string | undefined;
	} = $props();

	let isConnected = $state(false);
	let websocketUrl = $state('');
	let selectedShell = $state($settingsStore.defaultShell || '/bin/sh');
	let reconnectKey = $state(0);

	$effect(() => {
		if ($settingsStore.defaultShell) {
			selectedShell = $settingsStore.defaultShell;
		}

		if (containerId && selectedShell) {
			updateWebSocketUrl();
		}
	});

	function updateWebSocketUrl() {
		(async () => {
			const envId = await environmentStore.getCurrentEnvironmentId();
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = window.location.host;
			websocketUrl = `${protocol}//${host}/api/environments/${envId}/containers/${containerId}/exec/ws?shell=${encodeURIComponent(selectedShell)}`;
		})();
	}

	function handleShellChange(shell: string) {
		selectedShell = shell;
		updateWebSocketUrl();
	}

	function handleConnected() {
		isConnected = true;
	}

	function handleDisconnected() {
		isConnected = false;
	}

	function handleReconnect() {
		reconnectKey += 1;
		isConnected = false;
	}
</script>

<Card.Root class="flex flex-col gap-0 p-0">
	<Card.Header class="bg-muted rounded-t-xl p-4">
		<TerminalHeader {isConnected} bind:selectedShell onShellChange={handleShellChange} onReconnect={handleReconnect} />
		<Card.Description class="mt-4">{m.shell_interactive_access()}</Card.Description>
	</Card.Header>
	<Card.Content class="overflow-hidden p-2">
		<div class="h-full overflow-hidden rounded-lg border">
			{#if websocketUrl}
				{#key reconnectKey}
					<Terminal
						{websocketUrl}
						height="calc(100vh - 320px)"
						onConnected={handleConnected}
						onDisconnected={handleDisconnected}
					/>
				{/key}
			{/if}
		</div>
	</Card.Content>
</Card.Root>
