<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { RefreshCw, Key, Plus, Trash2, ImageMinus, Server, Ellipsis, Pencil } from '@lucide/svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { PageData } from '../$types';
	import { Button } from '$lib/components/ui/button/index.js';
	import { settingsStore, saveSettingsToServer } from '$lib/stores/settings-store';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import RegistryFormDialog from '$lib/components/dialogs/registry-form-dialog.svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { toast } from 'svelte-sonner';
	import type { RegistryCredential } from '$lib/types/settings.type';

	let { data } = $props<{ data: PageData }>();

	let isRegistryDialogOpen = $state(false);
	let registryToEdit = $state<(RegistryCredential & { originalIndex?: number }) | null>(null);
	let isLoadingRegistryAction = $state(false);

	$effect(() => {
		if (data.settings) {
			settingsStore.update((current) => ({
				...current,
				...data.settings
			}));
		}
	});

	function openCreateRegistryDialog() {
		registryToEdit = null;
		isRegistryDialogOpen = true;
	}

	function openEditRegistryDialog(credential: RegistryCredential, index: number) {
		registryToEdit = { ...credential, originalIndex: index };
		isRegistryDialogOpen = true;
	}

	async function handleRegistryDialogSubmit(eventDetail: { credential: RegistryCredential; isEditMode: boolean; originalIndex?: number }) {
		const { credential, isEditMode, originalIndex } = eventDetail;
		isLoadingRegistryAction = true;
		try {
			settingsStore.update((current) => {
				const updatedCredentials = [...(current.registryCredentials || [])];
				if (isEditMode && originalIndex !== undefined) {
					updatedCredentials[originalIndex] = credential;
				} else {
					updatedCredentials.push(credential);
				}
				return {
					...current,
					registryCredentials: updatedCredentials
				};
			});

			const savedToServer = await saveSettingsToServer();
			if (savedToServer) {
				toast.success(isEditMode ? 'Registry Credential Updated Successfully' : 'Registry Credential Added Successfully');
			} else {
				toast.error('Failed to save registry settings to server.');
			}
		} catch (error) {
			console.error('Error handling registry dialog submit:', error);
			toast.error('An error occurred while saving registry settings.');
		} finally {
			isRegistryDialogOpen = false;
			isLoadingRegistryAction = false;
		}
	}

	function confirmRemoveRegistry(index: number) {
		const registryUrl = $settingsStore.registryCredentials?.[index]?.url || `Registry #${index + 1}`;
		openConfirmDialog({
			title: 'Remove Registry',
			message: `Are you sure you want to remove the registry "${registryUrl}"? This action cannot be undone.`,
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					await removeRegistry(index);
				}
			}
		});
	}

	async function removeRegistry(index: number) {
		isLoadingRegistryAction = true;
		try {
			settingsStore.update((current) => ({
				...current,
				registryCredentials: (current.registryCredentials || []).filter((_, i) => i !== index)
			}));

			const savedToServer = await saveSettingsToServer();
			if (savedToServer) {
				toast.success('Registry Credential Removed Successfully');
			} else {
				toast.error('Failed to update registry settings on server.');
			}
		} catch (error) {
			console.error('Error removing registry:', error);
			toast.error('An error occurred while removing the registry.');
		} finally {
			isLoadingRegistryAction = false;
		}
	}
</script>

<RegistryFormDialog bind:open={isRegistryDialogOpen} bind:credentialToEdit={registryToEdit} onSubmit={handleRegistryDialogSubmit} isLoading={isLoadingRegistryAction} />

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-blue-500/10 p-2 rounded-full">
					<Server class="text-blue-500 size-5" />
				</div>
				<div>
					<Card.Title>Docker Settings</Card.Title>
					<Card.Description>Configure Docker connection and registry credentials</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<div class="space-y-2">
					<label for="dockerHost" class="text-sm font-medium block mb-1.5">Docker Host</label>
					<Input type="text" id="dockerHost" name="dockerHost" bind:value={$settingsStore.dockerHost} placeholder="unix:///var/run/docker.sock" required />
					<p class="text-xs text-muted-foreground">For local Docker: unix:///var/run/docker.sock (Unix)</p>
				</div>

				<div class="pt-4 border-t mt-4">
					<div class="flex items-center justify-between gap-2 mb-3">
						<div class="flex items-center gap-2">
							<div class="bg-green-500/10 p-2 rounded-full">
								<Key class="text-green-500 size-5" />
							</div>
							<div>
								<h3 class="font-medium">Docker Registry Credentials</h3>
								<p class="text-sm text-muted-foreground">Configure access to private Docker registries</p>
							</div>
						</div>
						<Button size="sm" variant="outline" onclick={openCreateRegistryDialog}>
							<Plus class="mr-2 size-4" /> Add Registry
						</Button>
					</div>

					<div class="space-y-2">
						{#if !$settingsStore.registryCredentials || $settingsStore.registryCredentials.length === 0}
							<div class="text-center py-8 text-muted-foreground italic border rounded-md">No registry credentials configured yet.</div>
						{:else}
							<UniversalTable
								data={$settingsStore.registryCredentials}
								columns={[
									{ accessorKey: 'url', header: 'Registry URL' },
									{ accessorKey: 'username', header: 'Username' },
									{ accessorKey: 'actions', header: ' ', enableSorting: false }
								]}
								features={{
									sorting: true,
									filtering: false,
									selection: false
								}}
								pagination={{
									pageSize: 5,
									pageSizeOptions: [5]
								}}
								sort={{
									defaultSort: { id: 'url', desc: false }
								}}
								display={{
									noResultsMessage: 'No registry credentials found.'
								}}
							>
								{#snippet rows({ item, index })}
									{#if typeof index === 'number'}
										<Table.Cell class="font-medium">
											{item.url || 'Default (Docker Hub)'}
										</Table.Cell>
										<Table.Cell>{item.username || '-'}</Table.Cell>
										<Table.Cell class="text-right">
											<DropdownMenu.Root>
												<DropdownMenu.Trigger>
													<Button variant="ghost" size="icon" class="size-8">
														<Ellipsis class="size-4" />
														<span class="sr-only">Open menu</span>
													</Button>
												</DropdownMenu.Trigger>
												<DropdownMenu.Content align="end">
													<DropdownMenu.Item onclick={() => openEditRegistryDialog(item, index)}>
														<Pencil class="mr-2 size-4" />
														Edit
													</DropdownMenu.Item>
													<DropdownMenu.Item onclick={() => confirmRemoveRegistry(index)} class="text-red-500 focus:text-red-700! focus:bg-destructive/10">
														<Trash2 class="mr-2 size-4" />
														Remove
													</DropdownMenu.Item>
												</DropdownMenu.Content>
											</DropdownMenu.Root>
										</Table.Cell>
									{/if}
								{/snippet}
							</UniversalTable>
						{/if}
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="space-y-6">
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-amber-500/10 p-2 rounded-full">
						<RefreshCw class="text-amber-500 size-5" />
					</div>
					<div>
						<Card.Title>Image Polling</Card.Title>
						<Card.Description>Control container image polling</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
					<div class="space-y-0.5">
						<label for="pollingEnabledSwitch" class="text-base font-medium">Check for New Images</label>
						<p class="text-sm text-muted-foreground">Periodically check for newer versions of container images</p>
					</div>
					<Switch
						id="pollingEnabledSwitch"
						name="pollingEnabled"
						checked={$settingsStore.pollingEnabled}
						onCheckedChange={(checked) => {
							settingsStore.update((current) => ({ ...current, pollingEnabled: checked }));
						}}
					/>
				</div>

				{#if $settingsStore.pollingEnabled}
					<div class="space-y-2 px-1">
						<label for="pollingInterval" class="text-sm font-medium"> Polling Interval (minutes) </label>
						<Input
							id="pollingInterval"
							type="number"
							value={$settingsStore.pollingInterval}
							oninput={(e: Event) =>
								settingsStore.update((cur) => ({
									...cur,
									pollingInterval: +(e.target as HTMLInputElement).value
								}))}
							min="5"
							max="60"
						/>
						<p class="text-xs text-muted-foreground">Set between 5-60 minutes.</p>
					</div>

					<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
						<div class="space-y-0.5">
							<Label for="autoUpdateSwitch" class="text-base font-medium">Auto Update Containers</Label>
							<p class="text-sm text-muted-foreground">Automatically update containers when newer images are available</p>
						</div>
						<Switch
							id="autoUpdateSwitch"
							checked={$settingsStore.autoUpdate}
							onCheckedChange={(checked) => {
								settingsStore.update((current) => ({ ...current, autoUpdate: checked }));
							}}
						/>
					</div>

					{#if $settingsStore.autoUpdate}
						<div class="space-y-2 mt-4">
							<Label for="autoUpdateInterval" class="text-base font-medium">Auto-update check interval (minutes)</Label>
							<Input
								id="autoUpdateInterval"
								type="number"
								value={$settingsStore.autoUpdateInterval}
								oninput={(e: Event) =>
									settingsStore.update((cur) => ({
										...cur,
										autoUpdateInterval: +(e.target as HTMLInputElement).value
									}))}
								min="5"
								max="1440"
							/>
							<p class="text-sm text-muted-foreground">How often Arcane will check for container and stack updates (minimum 5 minutes, maximum 24 hours)</p>
						</div>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-purple-500/10 p-2 rounded-full">
						<ImageMinus class="text-purple-500 size-5" />
					</div>
					<div>
						<Card.Title>Image Pruning</Card.Title>
						<Card.Description>Configure image prune behavior</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div>
					<Label for="pruneMode" class="text-base font-medium block mb-2">Prune Action Behavior</Label>
					<RadioGroup.Root
						value={$settingsStore.pruneMode}
						onValueChange={(val) => {
							settingsStore.update((current) => ({ ...current, pruneMode: val as 'all' | 'dangling' }));
						}}
						class="flex flex-col space-y-1"
						id="pruneMode"
					>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="all" id="prune-all" />
							<Label for="prune-all" class="font-normal">All Unused Images (like `docker image prune -a`)</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="dangling" id="prune-dangling" />
							<Label for="prune-dangling" class="font-normal">Dangling Images Only (like `docker image prune`)</Label>
						</div>
					</RadioGroup.Root>
					<p class="text-xs text-muted-foreground mt-2">Select which images are removed by the "Prune Unused" action on the Images page.</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
