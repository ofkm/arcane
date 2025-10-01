<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import Terminal from '$lib/components/terminal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { environmentStore } from '$lib/stores/environment.store';

	let {
		containerId
	}: {
		containerId: string | undefined;
	} = $props();

	let isConnected = $state(false);
	let websocketUrl = $state('');
	let selectedShell = $state('/bin/sh');
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
		if (containerId) {
			updateWebSocketUrl();
		}
	});

	function updateWebSocketUrl() {
		(async () => {
			const envId = await environmentStore.getCurrentEnvironmentId();
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = window.location.host;
			const shell = useCustomShell ? customShell : selectedShell;
			websocketUrl = `${protocol}//${host}/api/environments/${envId}/containers/${containerId}/exec/ws?shell=${encodeURIComponent(shell)}`;
		})();
	}

	function handleShellChange(value: string | undefined) {
		if (!value) return;

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
			updateWebSocketUrl();
		}
	}

	function handleConnected() {
		isConnected = true;
	}

	function handleDisconnected() {
		isConnected = false;
	}
</script>

<Card.Root class="flex flex-col gap-0 p-0">
	<Card.Header class="bg-muted rounded-t-xl p-4">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2">
				<TerminalIcon class="text-primary size-5" />
				<Card.Title class="text-lg">
					<h2>{m.shell_title()}</h2>
				</Card.Title>
				{#if isConnected}
					<div class="flex items-center gap-2">
						<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
						<span class="text-xs font-semibold text-green-600 sm:text-sm">{m.common_live()}</span>
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<Select.Root bind:value={selectedShell} type="single" onValueChange={handleShellChange}>
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
					<div class="flex items-center gap-2">
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
					</div>
				{/if}
			</div>
		</div>
		<Card.Description>{m.shell_interactive_access()}</Card.Description>
	</Card.Header>
	<Card.Content class="overflow-hidden p-2">
		<div class="h-full overflow-hidden rounded-lg border">
			{#if websocketUrl}
				<Terminal {websocketUrl} height="calc(100vh - 320px)" onConnected={handleConnected} onDisconnected={handleDisconnected} />
			{/if}
		</div>
	</Card.Content>
</Card.Root>
