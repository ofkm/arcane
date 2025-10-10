<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Terminal from '$lib/components/terminal/terminal.svelte';
	import TerminalControls from '$lib/components/terminal/terminal-controls.svelte';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
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
	let lastContainerId = $state<string | undefined>(undefined);
	let lastShell = $state<string | undefined>(undefined);

	$effect(() => {
		// Only update if container or shell actually changed
		const currentContainer = containerId;
		const currentShell = $settingsStore.defaultShell || selectedShell;

		if (lastContainerId === currentContainer && lastShell === currentShell) {
			return; // No change, skip update
		}

		lastContainerId = currentContainer;
		lastShell = currentShell;

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

<Card.Root>
	<Card.Header icon={TerminalIcon}>
		<div class="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center gap-2">
					<Card.Title>
						<h2>
							{m.shell_title()}
						</h2>
					</Card.Title>
					{#if isConnected}
						<div class="flex items-center gap-2">
							<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
							<span class="text-xs font-semibold text-green-600 sm:text-sm">{m.common_live()}</span>
						</div>
					{/if}
				</div>
				<Card.Description>{m.shell_interactive_access()}</Card.Description>
			</div>
			<TerminalControls bind:selectedShell onShellChange={handleShellChange} onReconnect={handleReconnect} />
		</div>
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
