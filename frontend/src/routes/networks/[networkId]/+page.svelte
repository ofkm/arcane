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

		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
			<div class="flex flex-col">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold tracking-tight">
						{network?.Name || 'Network Details'}
					</h1>

					<div class="hidden sm:block">
						<StatusBadge variant="gray" text={`ID: ${shortId}`} />
					</div>
				</div>

				<div class="mt-2 flex gap-2">
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
					<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-500/10 p-2">
								<Hash class="size-5 text-gray-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">ID</p>
								<p class="mt-1 truncate text-base font-semibold" title={network.Id}>{network.Id}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 p-2">
								<Network class="size-5 text-blue-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Name</p>
								<p class="mt-1 text-base font-semibold break-words">{network.Name}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 p-2">
								<HardDrive class="size-5 text-orange-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Driver</p>
								<p class="mt-1 text-base font-semibold">{network.Driver}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10 p-2">
								<Globe class="size-5 text-purple-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Scope</p>
								<p class="mt-1 text-base font-semibold capitalize">{network.Scope}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 p-2">
								<Clock class="size-5 text-green-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Created</p>
								<p class="mt-1 text-base font-semibold">{createdDate}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 p-2">
								<Layers class="size-5 text-yellow-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Attachable</p>
								<p class="mt-1 text-base font-semibold">
									<StatusBadge variant={network.Attachable ? 'green' : 'gray'} text={network.Attachable ? 'Yes' : 'No'} />
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 p-2">
								<Settings class="size-5 text-red-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">Internal</p>
								<p class="mt-1 text-base font-semibold">
									<StatusBadge variant={network.Internal ? 'blue' : 'gray'} text={network.Internal ? 'Yes' : 'No'} />
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 p-2">
								<ListTree class="size-5 text-indigo-500" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted-foreground text-sm font-medium">IPv6 Enabled</p>
								<p class="mt-1 text-base font-semibold">
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
							<div class="bg-card/50 mb-4 rounded-lg border p-4 last:mb-0">
								<div class="space-y-2">
									{#if config.Subnet}
										<div class="flex flex-col sm:flex-row sm:items-center">
											<span class="text-muted-foreground w-full text-sm font-medium sm:w-24">Subnet:</span>
											<code class="bg-muted text-muted-foreground mt-1 rounded px-1.5 py-0.5 font-mono text-xs sm:mt-0 sm:text-sm">
												{config.Subnet}
											</code>
										</div>
									{/if}

									{#if config.Gateway}
										<div class="flex flex-col sm:flex-row sm:items-center">
											<span class="text-muted-foreground w-full text-sm font-medium sm:w-24">Gateway:</span>
											<code class="bg-muted text-muted-foreground mt-1 rounded px-1.5 py-0.5 font-mono text-xs sm:mt-0 sm:text-sm">
												{config.Gateway}
											</code>
										</div>
									{/if}

									{#if config.IPRange}
										<div class="flex flex-col sm:flex-row sm:items-center">
											<span class="text-muted-foreground w-full text-sm font-medium sm:w-24">IP Range:</span>
											<code class="bg-muted text-muted-foreground mt-1 rounded px-1.5 py-0.5 font-mono text-xs sm:mt-0 sm:text-sm">
												{config.IPRange}
											</code>
										</div>
									{/if}

									{#if config.AuxiliaryAddresses && Object.keys(config.AuxiliaryAddresses).length > 0}
										<div class="mt-3">
											<p class="text-muted-foreground mb-1 text-sm font-medium">Auxiliary Addresses:</p>
											<ul class="ml-4 space-y-1">
												{#each Object.entries(config.AuxiliaryAddresses) as [name, addr] (name)}
													<li class="flex font-mono text-xs">
														<span class="text-muted-foreground mr-2">{name}:</span>
														<code class="bg-muted text-muted-foreground rounded px-1 py-0.5">{addr}</code>
													</li>
												{/each}
											</ul>
										</div>
									{/if}
								</div>
							</div>
						{/each}

						{#if network.IPAM.Driver}
							<div class="mt-4 flex items-center">
								<span class="text-muted-foreground mr-2 text-sm font-medium">IPAM Driver:</span>
								<StatusBadge variant="cyan" text={network.IPAM.Driver} />
							</div>
						{/if}

						{#if network.IPAM.Options && Object.keys(network.IPAM.Options).length > 0}
							<div class="mt-4">
								<p class="text-muted-foreground mb-2 text-sm font-medium">IPAM Options:</p>
								<div class="bg-muted/50 rounded-lg border p-3">
									{#each Object.entries(network.IPAM.Options) as [key, value] (key)}
										<div class="mb-1 flex justify-between font-mono text-xs last:mb-0">
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
						<div class="bg-card divide-y rounded-lg border">
							{#each connectedContainers as container (container.Name)}
								<div class="flex flex-col p-3 sm:flex-row sm:items-center">
									<div class="mb-2 w-full font-medium break-all sm:mb-0 sm:w-1/3">
										<a href="/containers/{container.Name}" class="text-primary flex items-center hover:underline">
											<Container class="text-muted-foreground mr-1.5 size-3.5" />
											{container.Name}
										</a>
									</div>
									<div class="w-full pl-0 sm:w-2/3 sm:pl-4">
										<code class="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs break-all sm:text-sm">
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
						<div class="bg-card divide-y rounded-lg border">
							{#each Object.entries(network.Labels) as [key, value] (key)}
								<div class="flex flex-col p-3 sm:flex-row">
									<div class="text-muted-foreground mb-2 w-full font-medium break-all sm:mb-0 sm:w-1/3">
										{key}
									</div>
									<div class="bg-muted/50 w-full rounded p-2 font-mono text-xs break-all sm:w-2/3 sm:text-sm">
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
						<div class="bg-card divide-y rounded-lg border">
							{#each Object.entries(network.Options) as [key, value] (key)}
								<div class="flex flex-col p-3 sm:flex-row">
									<div class="text-muted-foreground mb-2 w-full font-medium break-all sm:mb-0 sm:w-1/3">
										{key}
									</div>
									<div class="bg-muted/50 w-full rounded p-2 font-mono text-xs break-all sm:w-2/3 sm:text-sm">
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
		<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
			<div class="bg-muted/30 mb-4 rounded-full p-4">
				<Network class="text-muted-foreground size-10 opacity-70" />
			</div>
			<h2 class="mb-2 text-xl font-medium">Network Not Found</h2>
			<p class="text-muted-foreground mb-6">The requested network could not be found or is no longer available.</p>
			<ArcaneButton action="cancel" customLabel="Back to Networks" onClick={() => goto('/networks')} size="sm" />
		</div>
	{/if}
</div>
