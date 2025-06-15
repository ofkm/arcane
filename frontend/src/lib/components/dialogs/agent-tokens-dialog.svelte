<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { AgentToken } from '$lib/types/agent.type';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Copy, Plus, Trash2, Key } from '@lucide/svelte';
	import { agentAPI } from '$lib/services/api';

	let { agentId } = $props();

	let tokens = $state<AgentToken[]>([]);
	let loading = $state(false);
	let createDialogOpen = $state(false);
	let newTokenName = $state('');
	let newTokenValue = $state('');
	let showTokenValue = $state(false);

	onMount(async () => {
		await loadTokens();
	});

	async function loadTokens() {
		try {
			loading = true;
			tokens = await agentAPI.getAgentTokens(agentId);
		} catch (err) {
			console.error('Failed to load tokens:', err);
			toast.error('Failed to load tokens');
		} finally {
			loading = false;
		}
	}

	async function createToken() {
		if (!newTokenName.trim()) {
			toast.error('Token name is required');
			return;
		}

		try {
			const result = await agentAPI.createAgentToken(agentId, {
				name: newTokenName,
				permissions: ['read', 'write']
			});

			newTokenValue = result.value;
			showTokenValue = true;

			await loadTokens();
			toast.success('Token created successfully');
		} catch (err) {
			console.error('Failed to create token:', err);
			toast.error('Failed to create token');
		}
	}

	async function deleteToken(tokenId: string) {
		try {
			await agentAPI.deleteAgentToken(agentId, tokenId);
			await loadTokens();
			toast.success('Token deleted successfully');
		} catch (err) {
			console.error('Failed to delete token:', err);
			toast.error('Failed to delete token');
		}
	}

	function copyToken() {
		navigator.clipboard.writeText(newTokenValue);
		toast.success('Token copied to clipboard');
	}

	function closeDialog() {
		createDialogOpen = false;
		showTokenValue = false;
		newTokenName = '';
		newTokenValue = '';
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Key class="size-5" />
				<Card.Title>Agent Tokens</Card.Title>
			</div>
			<Button size="sm" onclick={() => (createDialogOpen = true)}>
				<Plus class="mr-2 size-4" />
				Create Token
			</Button>
		</div>
	</Card.Header>
	<Card.Content>
		{#if loading}
			<div class="text-center py-8">Loading tokens...</div>
		{:else if tokens.length === 0}
			<div class="text-center py-8 text-muted-foreground">
				<Key class="mx-auto mb-4 size-12 opacity-50" />
				<p>No tokens created yet</p>
				<p class="text-sm">Create a token to allow this agent to authenticate</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each tokens as token}
					<div class="flex items-center justify-between rounded-lg border p-3">
						<div>
							<p class="font-medium">{token.name}</p>
							<p class="text-sm text-muted-foreground">
								Created: {new Date(token.createdAt).toLocaleDateString()}
								{#if token.lastUsed}
									• Last used: {new Date(Number(token.lastUsed) * 1000).toLocaleDateString()}
								{/if}
							</p>
						</div>
						<Button variant="ghost" size="sm" onclick={() => deleteToken(token.id)}>
							<Trash2 class="size-4" />
						</Button>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<Dialog.Root bind:open={createDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create Agent Token</Dialog.Title>
			<Dialog.Description>Create a new authentication token for this agent</Dialog.Description>
		</Dialog.Header>

		{#if showTokenValue}
			<div class="space-y-4">
				<div class="rounded-lg bg-muted p-4">
					<p class="mb-2 text-sm font-medium">Your new token:</p>
					<div class="flex items-center gap-2">
						<code class="flex-1 break-all text-sm">{newTokenValue}</code>
						<Button size="sm" variant="outline" onclick={copyToken}>
							<Copy class="size-4" />
						</Button>
					</div>
				</div>
				<div class="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
					<p class="text-sm text-orange-800 dark:text-orange-200">
						<strong>Important:</strong> This token will only be shown once. Make sure to copy and store it securely.
					</p>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				<div>
					<Label for="token-name">Token Name</Label>
					<Input id="token-name" bind:value={newTokenName} placeholder="Production Agent Token" />
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={closeDialog}>
				{showTokenValue ? 'Close' : 'Cancel'}
			</Button>
			{#if !showTokenValue}
				<Button onclick={createToken}>Create Token</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
