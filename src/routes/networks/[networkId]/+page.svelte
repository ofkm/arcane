<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, RefreshCw, HardDrive, Clock, Tag, Layers, Hash, Trash2, Loader2, Network, Globe, Settings, ListTree, Container } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatDate } from '$lib/utils'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/utils.ts
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/components/confirm-dialog.svelte
	import type { NetworkInspectInfo } from 'dockerode';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let { network }: { network: NetworkInspectInfo | null | undefined } = $derived(data);

	let isRefreshing = $state(false);
	let isRemoving = $state(false);
	let showRemoveConfirm = $state(false);

	const shortId = $derived(network?.Id?.substring(0, 12) || 'N/A');
	const createdDate = $derived(network?.Created ? formatDate(network.Created) : 'N/A');
	const connectedContainers = $derived(network?.Containers ? Object.values(network.Containers) : []);
	// Determine if network is potentially in use (basic check)
	const inUse = $derived(connectedContainers.length > 0);
	// Determine if network is predefined (cannot be removed)
	const isPredefined = $derived(network?.Name === 'bridge' || network?.Name === 'host' || network?.Name === 'none');

	async function refreshData() {
		isRefreshing = true;
		try {
			await invalidateAll();
		} finally {
			isRefreshing = false;
		}
	}

	function triggerRemove() {
		if (isPredefined) {
			// Optionally show a toast or alert instead of the dialog
			console.warn('Cannot remove predefined network');
			return;
		}
		showRemoveConfirm = true;
	}

	// This function is called by the ConfirmDialog
	function handleRemoveConfirm() {
		// No 'force' option for network removal in standard Docker API
		const removeForm = document.getElementById('remove-network-form') as HTMLFormElement;
		if (removeForm) {
			removeForm.submit();
		}
	}
</script>

<!-- Confirmation Dialog for Remove -->
<ConfirmDialog bind:open={showRemoveConfirm} title="Confirm Network Removal" description={`Are you sure you want to remove network "${network?.Name}" (${shortId})? This action cannot be undone. Ensure no containers are connected.`} confirmLabel="Remove" variant="destructive" onConfirm={handleRemoveConfirm} itemType="network" isRunning={inUse} />

<div class="space-y-6 pb-8">
	<!-- Breadcrumb Navigation -->
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/networks">Networks</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{network?.Name || shortId}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
			<div class="mt-2 flex items-center gap-2">
				<h1 class="text-2xl font-bold tracking-tight break-all">
					{network?.Name || 'Network Details'}
				</h1>
				{#if inUse}
					<Badge variant="outline"><Container class="h-3 w-3 mr-1" /> In Use</Badge>
				{/if}
				{#if isPredefined}
					<Badge variant="secondary">Predefined</Badge>
				{/if}
			</div>
		</div>

		<div class="flex gap-2 flex-wrap">
			<Button variant="outline" size="sm" onclick={refreshData} disabled={isRefreshing}>
				<RefreshCw class={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
			</Button>
			<!-- Remove Button triggers dialog -->
			<Button variant="destructive" size="sm" onclick={triggerRemove} disabled={isRemoving || isPredefined} title={isPredefined ? 'Cannot remove predefined networks' : ''}>
				{#if isRemoving}
					<Loader2 class="h-4 w-4 mr-2 animate-spin" />
				{:else}
					<Trash2 class="h-4 w-4 mr-2" />
				{/if} Remove
			</Button>
			<!-- Hidden form for removal action -->
			<form
				id="remove-network-form"
				method="POST"
				action="?/remove"
				use:enhance={() => {
					isRemoving = true;
					return async ({ update }) => {
						await update({ reset: false });
						isRemoving = false;
						// isRemoving will be reset by effect or on navigation
					};
				}}
				class="hidden"
			>
				<input type="hidden" name="networkId" value={network?.Id} />
				<button type="submit">Submit</button>
			</form>
		</div>
	</div>

	<!-- Error Alert -->
	{#if form?.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4 mr-2" />
			<Alert.Title>Action Failed</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if network}
		<!-- Network Details Section -->
		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header>
					<Card.Title>Network Details</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						<!-- ID -->
						<div class="flex items-start gap-3">
							<div class="bg-gray-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Hash class="h-5 w-5 text-gray-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">ID</p>
								<p class="text-base font-semibold mt-1 truncate" title={network.Id}>{shortId}</p>
							</div>
						</div>

						<!-- Name -->
						<div class="flex items-start gap-3">
							<div class="bg-blue-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Network class="h-5 w-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Name</p>
								<p class="text-base font-semibold mt-1 break-all">{network.Name}</p>
							</div>
						</div>

						<!-- Driver -->
						<div class="flex items-start gap-3">
							<div class="bg-orange-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<HardDrive class="h-5 w-5 text-orange-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Driver</p>
								<p class="text-base font-semibold mt-1">{network.Driver}</p>
							</div>
						</div>

						<!-- Scope -->
						<div class="flex items-start gap-3">
							<div class="bg-purple-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Globe class="h-5 w-5 text-purple-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Scope</p>
								<p class="text-base font-semibold mt-1 capitalize">{network.Scope}</p>
							</div>
						</div>

						<!-- Created -->
						<div class="flex items-start gap-3">
							<div class="bg-green-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Clock class="h-5 w-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Created</p>
								<p class="text-base font-semibold mt-1">{createdDate}</p>
							</div>
						</div>

						<!-- Attachable -->
						<div class="flex items-start gap-3">
							<div class="bg-yellow-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Layers class="h-5 w-5 text-yellow-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Attachable</p>
								<p class="text-base font-semibold mt-1">{network.Attachable ? 'Yes' : 'No'}</p>
							</div>
						</div>

						<!-- Internal -->
						<div class="flex items-start gap-3">
							<div class="bg-red-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<Settings class="h-5 w-5 text-red-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Internal</p>
								<p class="text-base font-semibold mt-1">{network.Internal ? 'Yes' : 'No'}</p>
							</div>
						</div>

						<!-- EnableIPv6 -->
						<div class="flex items-start gap-3">
							<div class="bg-indigo-500/10 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
								<ListTree class="h-5 w-5 text-indigo-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">IPv6 Enabled</p>
								<p class="text-base font-semibold mt-1">{network.EnableIPv6 ? 'Yes' : 'No'}</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- IPAM Configuration Card -->
			{#if network.IPAM?.Config && network.IPAM.Config.length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>IPAM Configuration</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#each network.IPAM.Config as config, i (i)}
							<div class="space-y-1">
								{#if config.Subnet}
									<p class="text-sm"><span class="font-medium text-muted-foreground">Subnet:</span> <span class="font-mono text-xs">{config.Subnet}</span></p>
								{/if}
								{#if config.Gateway}
									<p class="text-sm"><span class="font-medium text-muted-foreground">Gateway:</span> <span class="font-mono text-xs">{config.Gateway}</span></p>
								{/if}
								{#if config.IPRange}
									<p class="text-sm"><span class="font-medium text-muted-foreground">IP Range:</span> <span class="font-mono text-xs">{config.IPRange}</span></p>
								{/if}
								{#if config.AuxiliaryAddresses && Object.keys(config.AuxiliaryAddresses).length > 0}
									<p class="text-sm font-medium text-muted-foreground mt-1">Auxiliary Addresses:</p>
									<ul class="list-disc list-inside pl-4">
										{#each Object.entries(config.AuxiliaryAddresses) as [name, addr] (name)}
											<li class="text-xs font-mono">{name}: {addr}</li>
										{/each}
									</ul>
								{/if}
							</div>
							{#if i < network.IPAM.Config.length - 1}
								<Separator />
							{/if}
						{/each}
						{#if network.IPAM.Driver}
							<p class="text-sm mt-2"><span class="font-medium text-muted-foreground">IPAM Driver:</span> {network.IPAM.Driver}</p>
						{/if}
						{#if network.IPAM.Options && Object.keys(network.IPAM.Options).length > 0}
							<p class="text-sm font-medium text-muted-foreground mt-2">IPAM Options:</p>
							{#each Object.entries(network.IPAM.Options) as [key, value] (key)}
								<p class="text-xs font-mono pl-4">{key}: {value}</p>
							{/each}
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Connected Containers Card -->
			{#if connectedContainers.length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title class="flex items-center gap-2"><Container class="h-5 w-5 text-muted-foreground" /> Connected Containers ({connectedContainers.length})</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each connectedContainers as container (container.Name)}
							<div class="text-sm flex flex-col sm:flex-row sm:items-center">
								<span class="font-medium w-full sm:w-1/3 break-all">
									<a href="/containers/{container.Name}" class="hover:underline text-primary">{container.Name}</a>
								</span>
								<span class="font-mono text-xs sm:text-sm break-all w-full sm:w-2/3">
									{container.IPv4Address || container.IPv6Address || 'N/A'}
								</span>
							</div>
							{#if connectedContainers.indexOf(container) < connectedContainers.length - 1}
								<Separator class="my-2" />
							{/if}
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Labels Card -->
			{#if network.Labels && Object.keys(network.Labels).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title class="flex items-center gap-2"><Tag class="h-5 w-5 text-muted-foreground" /> Labels</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each Object.entries(network.Labels) as [key, value] (key)}
							<div class="text-sm flex flex-col sm:flex-row sm:items-center">
								<span class="font-medium text-muted-foreground w-full sm:w-1/4 break-all">{key}:</span>
								<span class="font-mono text-xs sm:text-sm break-all w-full sm:w-3/4">{value}</span>
							</div>
							{#if Object.keys(network.Labels).indexOf(key) < Object.keys(network.Labels).length - 1}
								<Separator class="my-2" />
							{/if}
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Options Card -->
			{#if network.Options && Object.keys(network.Options).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Options</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each Object.entries(network.Options) as [key, value] (key)}
							<div class="text-sm flex flex-col sm:flex-row sm:items-center">
								<span class="font-medium text-muted-foreground w-full sm:w-1/4 break-all">{key}:</span>
								<span class="font-mono text-xs sm:text-sm break-all w-full sm:w-3/4">{value}</span>
							</div>
							{#if Object.keys(network.Options).indexOf(key) < Object.keys(network.Options).length - 1}
								<Separator class="my-2" />
							{/if}
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<!-- Network Not Found Section -->
		<div class="text-center py-12">
			<p class="text-lg font-medium text-muted-foreground">Network not found.</p>
			<Button href="/networks" variant="outline" size="sm" class="mt-4">
				<ArrowLeft class="h-4 w-4 mr-2" /> Back to Networks
			</Button>
		</div>
	{/if}
</div>
