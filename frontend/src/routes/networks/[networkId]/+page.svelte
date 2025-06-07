<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { AlertCircle, HardDrive, Clock, Tag, Layers, Hash, Network, Globe, Settings, ListTree, Container } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { formatDate } from '$lib/utils/string.utils';
	import type { NetworkInspectInfo } from 'dockerode';
	import { toast } from 'svelte-sonner';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { goto } from '$app/navigation';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import NetworkAPIService from '$lib/services/api/network-api-service';

	let { data }: { data: PageData } = $props();
	let { network }: { network: NetworkInspectInfo | null | undefined } = $derived(data);
	let errorMessage = $state('');

	let isRemoving = $state(false);
	const networkApi = new NetworkAPIService();

	const shortId = $derived(network?.Id?.substring(0, 12) || 'N/A');
	const createdDate = $derived(network?.Created ? formatDate(network.Created) : 'N/A');
	const connectedContainers = $derived(network?.Containers ? Object.values(network.Containers) : []);
	const inUse = $derived(connectedContainers.length > 0);
	const isPredefined = $derived(network?.Name === 'bridge' || network?.Name === 'host' || network?.Name === 'none');

	function triggerRemove() {
		if (isPredefined) {
			toast.error('Cannot Remove Predefined Networks');
			console.warn('Cannot remove predefined network');
			return;
		}

		if (!network?.Id) {
			toast.error('Network ID is missing');
			return;
		}

		openConfirmDialog({
			title: 'Remove Network',
			message: `Are you sure you want to remove the network "${network?.Name || shortId}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(networkApi.remove(network.Id)),
						message: 'Failed to remove network',
						setLoadingState: (value) => (isRemoving = value),
						onSuccess: async () => {
							toast.success(`Network "${network.Name || shortId}" removed successfully`);
							goto('/networks');
						},
						onError: (error) => {
							errorMessage = error?.message || 'An error occurred while removing the network';
							toast.error(errorMessage);
						}
					});
				}
			}
		});
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col space-y-4">
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

		<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
			<div class="flex flex-col">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold tracking-tight">
						{network?.Name || 'Network Details'}
					</h1>

					<div class="hidden sm:block">
						<StatusBadge variant="gray" text={`ID: ${shortId}`} />
					</div>
				</div>

				<div class="flex gap-2 mt-2">
					{#if inUse}
						<StatusBadge variant="green" text={`In Use (${connectedContainers.length})`} />
					{:else}
						<StatusBadge variant="amber" text="Unused" />
					{/if}

					{#if isPredefined}
						<StatusBadge variant="blue" text="Predefined" />
					{/if}

					<StatusBadge variant="purple" text={network?.Driver || 'Unknown'} />
				</div>
			</div>

			<div class="self-start">
				<ArcaneButton action="remove" customLabel="Remove Network" onClick={triggerRemove} loading={isRemoving} disabled={isRemoving || isPredefined} label={isPredefined ? 'Cannot remove predefined networks' : 'Delete Network'} />
			</div>
		</div>
	</div>

	{#if errorMessage}
		<Alert.Root variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Action Failed</Alert.Title>
			<Alert.Description>{errorMessage}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if network}
		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header class="pb-0">
					<Card.Title class="flex items-center gap-2 text-lg">
						<Network class="text-primary size-5" />
						Network Details
					</Card.Title>
					<Card.Description>Basic information about this Docker network</Card.Description>
				</Card.Header>
				<Card.Content class="pt-6">
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">
						<div class="flex items-start gap-3">
							<div class="bg-gray-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Hash class="text-gray-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">ID</p>
								<p class="text-base font-semibold mt-1 truncate" title={network.Id}>{network.Id}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-blue-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Network class="text-blue-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Name</p>
								<p class="text-base font-semibold mt-1 break-words">{network.Name}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-orange-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<HardDrive class="text-orange-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Driver</p>
								<p class="text-base font-semibold mt-1">{network.Driver}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-purple-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Globe class="text-purple-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Scope</p>
								<p class="text-base font-semibold mt-1 capitalize">{network.Scope}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-green-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Clock class="text-green-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Created</p>
								<p class="text-base font-semibold mt-1">{createdDate}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-yellow-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Layers class="text-yellow-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Attachable</p>
								<p class="text-base font-semibold mt-1">
									<StatusBadge variant={network.Attachable ? 'green' : 'gray'} text={network.Attachable ? 'Yes' : 'No'} />
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-red-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Settings class="text-red-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Internal</p>
								<p class="text-base font-semibold mt-1">
									<StatusBadge variant={network.Internal ? 'blue' : 'gray'} text={network.Internal ? 'Yes' : 'No'} />
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-indigo-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<ListTree class="text-indigo-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">IPv6 Enabled</p>
								<p class="text-base font-semibold mt-1">
									<StatusBadge variant={network.EnableIPv6 ? 'indigo' : 'gray'} text={network.EnableIPv6 ? 'Yes' : 'No'} />
								</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			{#if network.IPAM?.Config && network.IPAM.Config.length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header class="pb-0">
						<Card.Title class="flex items-center gap-2 text-lg">
							<Settings class="text-primary size-5" />
							IPAM Configuration
						</Card.Title>
						<Card.Description>IP Address Management settings for this network</Card.Description>
					</Card.Header>
					<Card.Content class="pt-6">
						{#each network.IPAM.Config as config, i (i)}
							<div class="p-4 rounded-lg bg-card/50 border mb-4 last:mb-0">
								<div class="space-y-2">
									{#if config.Subnet}
										<div class="flex flex-col sm:flex-row sm:items-center">
											<span class="text-sm font-medium text-muted-foreground w-full sm:w-24">Subnet:</span>
											<code class="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs sm:text-sm mt-1 sm:mt-0">
												{config.Subnet}
											</code>
										</div>
									{/if}

									{#if config.Gateway}
										<div class="flex flex-col sm:flex-row sm:items-center">
											<span class="text-sm font-medium text-muted-foreground w-full sm:w-24">Gateway:</span>
											<code class="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs sm:text-sm mt-1 sm:mt-0">
												{config.Gateway}
											</code>
										</div>
									{/if}

									{#if config.IPRange}
										<div class="flex flex-col sm:flex-row sm:items-center">
											<span class="text-sm font-medium text-muted-foreground w-full sm:w-24">IP Range:</span>
											<code class="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs sm:text-sm mt-1 sm:mt-0">
												{config.IPRange}
											</code>
										</div>
									{/if}

									{#if config.AuxiliaryAddresses && Object.keys(config.AuxiliaryAddresses).length > 0}
										<div class="mt-3">
											<p class="text-sm font-medium text-muted-foreground mb-1">Auxiliary Addresses:</p>
											<ul class="space-y-1 ml-4">
												{#each Object.entries(config.AuxiliaryAddresses) as [name, addr] (name)}
													<li class="text-xs font-mono flex">
														<span class="text-muted-foreground mr-2">{name}:</span>
														<code class="px-1 py-0.5 rounded bg-muted text-muted-foreground">{addr}</code>
													</li>
												{/each}
											</ul>
										</div>
									{/if}
								</div>
							</div>
						{/each}

						{#if network.IPAM.Driver}
							<div class="flex items-center mt-4">
								<span class="text-sm font-medium text-muted-foreground mr-2">IPAM Driver:</span>
								<StatusBadge variant="cyan" text={network.IPAM.Driver} />
							</div>
						{/if}

						{#if network.IPAM.Options && Object.keys(network.IPAM.Options).length > 0}
							<div class="mt-4">
								<p class="text-sm font-medium text-muted-foreground mb-2">IPAM Options:</p>
								<div class="bg-muted/50 p-3 rounded-lg border">
									{#each Object.entries(network.IPAM.Options) as [key, value] (key)}
										<div class="flex justify-between text-xs font-mono mb-1 last:mb-0">
											<span class="text-muted-foreground">{key}:</span>
											<span>{value}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}

			{#if connectedContainers.length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header class="pb-0">
						<Card.Title class="flex items-center gap-2 text-lg">
							<Container class="text-primary size-5" />
							Connected Containers
						</Card.Title>
						<Card.Description>
							{connectedContainers.length} container{connectedContainers.length === 1 ? '' : 's'} connected to this network
						</Card.Description>
					</Card.Header>
					<Card.Content class="pt-6">
						<div class="bg-card rounded-lg border divide-y">
							{#each connectedContainers as container (container.Name)}
								<div class="p-3 flex flex-col sm:flex-row sm:items-center">
									<div class="font-medium w-full sm:w-1/3 break-all mb-2 sm:mb-0">
										<a href="/containers/{container.Name}" class="hover:underline text-primary flex items-center">
											<Container class="size-3.5 mr-1.5 text-muted-foreground" />
											{container.Name}
										</a>
									</div>
									<div class="w-full sm:w-2/3 pl-0 sm:pl-4">
										<code class="px-1.5 py-0.5 text-xs sm:text-sm rounded bg-muted text-muted-foreground font-mono break-all">
											{container.IPv4Address || container.IPv6Address || 'N/A'}
										</code>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if network.Labels && Object.keys(network.Labels).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header class="pb-0">
						<Card.Title class="flex items-center gap-2 text-lg">
							<Tag class="text-primary size-5" />
							Labels
						</Card.Title>
						<Card.Description>User-defined metadata attached to this network</Card.Description>
					</Card.Header>
					<Card.Content class="pt-6">
						<div class="bg-card rounded-lg border divide-y">
							{#each Object.entries(network.Labels) as [key, value] (key)}
								<div class="p-3 flex flex-col sm:flex-row">
									<div class="font-medium text-muted-foreground w-full sm:w-1/3 break-all mb-2 sm:mb-0">
										{key}
									</div>
									<div class="font-mono text-xs sm:text-sm break-all w-full sm:w-2/3 bg-muted/50 p-2 rounded">
										{value}
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if network.Options && Object.keys(network.Options).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header class="pb-0">
						<Card.Title class="flex items-center gap-2 text-lg">
							<Settings class="text-primary size-5" />
							Options
						</Card.Title>
						<Card.Description>Network driver-specific options</Card.Description>
					</Card.Header>
					<Card.Content class="pt-6">
						<div class="bg-card rounded-lg border divide-y">
							{#each Object.entries(network.Options) as [key, value] (key)}
								<div class="p-3 flex flex-col sm:flex-row">
									<div class="font-medium text-muted-foreground w-full sm:w-1/3 break-all mb-2 sm:mb-0">
										{key}
									</div>
									<div class="font-mono text-xs sm:text-sm break-all w-full sm:w-2/3 bg-muted/50 p-2 rounded">
										{value}
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-16 px-4 text-center">
			<div class="bg-muted/30 rounded-full p-4 mb-4">
				<Network class="text-muted-foreground size-10 opacity-70" />
			</div>
			<h2 class="text-xl font-medium mb-2">Network Not Found</h2>
			<p class="text-muted-foreground mb-6">The requested network could not be found or is no longer available.</p>
			<ArcaneButton action="cancel" customLabel="Back to Networks" onClick={() => goto('/networks')} size="sm" />
		</div>
	{/if}
</div>
