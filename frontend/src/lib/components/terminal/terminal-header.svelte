<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import { m } from '$lib/paraglide/messages';

	let {
		isConnected = false,
		selectedShell = $bindable(),
		onShellChange,
		onReconnect
	}: {
		isConnected?: boolean;
		selectedShell: string;
		onShellChange?: (shell: string) => void;
		onReconnect?: () => void;
	} = $props();

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

	function handleShellChange(value: string | undefined) {
		if (!value) return;

		if (value === 'custom') {
			useCustomShell = true;
			selectedShell = value;
		} else {
			useCustomShell = false;
			selectedShell = value;
			onShellChange?.(value);
		}
	}

	function handleCustomShellSubmit() {
		if (customShell.trim()) {
			onShellChange?.(customShell);
		}
	}
</script>

<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div class="flex items-center gap-2">
		<TerminalIcon class="text-primary size-5" />
		<h2 class="text-lg font-semibold">{m.shell_title()}</h2>
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

		<!-- Reconnect Button -->
		<Button size="icon" variant="ghost" onclick={onReconnect} class="size-8" title="Reconnect shell">
			<RefreshCwIcon class="size-4" />
		</Button>
	</div>
</div>
