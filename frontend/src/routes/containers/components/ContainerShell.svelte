<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Terminal from '$lib/components/terminal/terminal.svelte';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import { ArcaneCard, ArcaneCardHeader } from '$lib/components/arcane-card';
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
	let customShell = $state('');
	let useCustomShell = $state(false);

	const commonShells = [
		{ value: '/bin/sh', label: 'sh' },
		{ value: '/bin/bash', label: 'bash' },
		{ value: '/bin/ash', label: 'ash' },
		{ value: '/bin/zsh', label: 'zsh' },
		{ value: 'custom', label: m.custom() }
	];

	const shellLabels: Record<string, string> = {
		'/bin/sh': 'sh',
		'/bin/bash': 'bash',
		'/bin/ash': 'ash',
		'/bin/zsh': 'zsh',
		custom: m.custom()
	};

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

	function handleShellChange(value: string) {
		if (value === 'custom') {
			useCustomShell = true;
			selectedShell = value;
		} else {
			useCustomShell = false;
			selectedShell = value;
			updateWebSocketUrl();
		}
	}

	function handleCustomShellSubmit() {
		if (customShell.trim()) {
			selectedShell = customShell;
			updateWebSocketUrl();
		}
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

<ArcaneCard>
	<ArcaneCardHeader icon={TerminalIcon}>
		<div class="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center gap-2">
					<Card.Title>{m.shell_title()}</Card.Title>
					{#if isConnected}
						<div class="flex items-center gap-2">
							<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
							<span class="text-xs font-semibold text-green-600 sm:text-sm">{m.common_live()}</span>
						</div>
					{/if}
				</div>
				<Card.Description>{m.shell_interactive_access()}</Card.Description>
			</div>
			<div class="flex items-center gap-2">
				<Select.Root bind:value={selectedShell} type="single" onValueChange={(value) => value && handleShellChange(value)}>
					<Select.Trigger class="h-8 w-[140px]">
						{shellLabels[selectedShell] ?? m.shell_select_placeholder()}
					</Select.Trigger>
					<Select.Content>
						{#each commonShells as shell}
							<Select.Item value={shell.value}>
								{shell.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				{#if useCustomShell}
					<Input
						type="text"
						bind:value={customShell}
						placeholder={m.shell_custom_placeholder()}
						class="h-8 w-[180px]"
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								handleCustomShellSubmit();
							}
						}}
					/>
					<Button size="sm" variant="outline" onclick={handleCustomShellSubmit} class="h-8">
						{m.apply()}
					</Button>
				{/if}

				<Button size="icon" variant="ghost" onclick={handleReconnect} class="size-8" title="Reconnect shell">
					<RefreshCwIcon class="size-4" />
				</Button>
			</div>
		</div>
	</ArcaneCardHeader>
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
</ArcaneCard>
