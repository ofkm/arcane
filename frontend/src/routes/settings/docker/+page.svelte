<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import type { FormInput as FormInputType } from '$lib/types/form.type';
	import { Button } from '$lib/components/ui/button/index.js';
	import { RefreshCw, Key, Plus, Trash2, ImageMinus, Server, Ellipsis, Pencil, Save } from '@lucide/svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import RegistryFormDialog from '$lib/components/dialogs/registry-form-dialog.svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import type { RegistryCredential } from '$lib/types/settings.type';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import FormInput from '$lib/components/form/form-input.svelte';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let isRegistryDialogOpen = $state(false);
	let registryToEdit = $state<(RegistryCredential & { originalIndex?: number }) | null>(null);
	let isLoadingRegistryAction = $state(false);
	let currentRegistries = $derived(currentSettings.registryCredentials);

	let isLoading = $state({
		saving: false
	});

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		currentSettings = await settingsAPI.updateSettings({
			...currentSettings,
			...updatedSettings
		});

		settingsStore.reload();
	}

	function handleDockerSettingUpdates() {
		updateSettingsConfig({
			dockerHost: dockerHostInput.value,
			pruneMode: 'all',
			autoUpdate: autoUpdateSwitch.value,
			pollingEnabled: pollingEnabledSwitch.value,
			pollingInterval: pollingIntervalInput.value,
			autoUpdateInterval: autoUpdateIntervalInput.value
		}).then(async () => {
			toast.success(`Settings Saved Successfully`);
			await invalidateAll();
		});
	}

	let pollingIntervalInput = $state<FormInputType<number>>({
		value: 0,
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let pollingEnabledSwitch = $state<FormInputType<boolean>>({
		value: false,
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let autoUpdateSwitch = $state<FormInputType<boolean>>({
		value: false,
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let autoUpdateIntervalInput = $state<FormInputType<number>>({
		value: 5,
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let dockerHostInput = $state<FormInputType<string>>({
		value: '',
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	$effect(() => {
		pollingIntervalInput.value = currentSettings.pollingInterval;
		pollingEnabledSwitch.value = currentSettings.pollingEnabled;
		autoUpdateSwitch.value = currentSettings.autoUpdate;
		autoUpdateIntervalInput.value = currentSettings.autoUpdateInterval;
		dockerHostInput.value = currentSettings.dockerHost;
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

		const updatedCredentials = [...(currentSettings.registryCredentials || [])];
		if (isEditMode && originalIndex !== undefined) {
			updatedCredentials[originalIndex] = credential;
		} else {
			updatedCredentials.push(credential);
		}

		const updatedSettings = {
			...currentSettings,
			registryCredentials: updatedCredentials
		};

		try {
			await settingsAPI.updateSettings(updatedSettings);
			currentSettings = updatedSettings;

			await settingsStore.reload();
			toast.success(isEditMode ? 'Registry Credential Updated Successfully' : 'Registry Credential Added Successfully');
			await invalidateAll();
		} catch (error) {
			console.error('Error handling registry dialog submit:', error);
			toast.error('An error occurred while saving registry settings.');
		} finally {
			isRegistryDialogOpen = false;
			isLoadingRegistryAction = false;
		}
	}

	function confirmRemoveRegistry(index: number) {
		const registryUrl = currentSettings.registryCredentials?.[index]?.url || `Registry #${index + 1}`;
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
			const updatedCredentials = (currentSettings.registryCredentials || []).filter((_, i) => i !== index);
			const updatedSettings = {
				...currentSettings,
				registryCredentials: updatedCredentials
			};

			await settingsAPI.updateSettings(updatedSettings);
			currentSettings = updatedSettings;

			await settingsStore.reload();
			toast.success('Registry Credential Removed Successfully');
			await invalidateAll();
		} catch (error) {
			console.error('Error removing registry:', error);
			toast.error('An error occurred while removing the registry.');
		} finally {
			isLoadingRegistryAction = false;
		}
	}
</script>

<svelte:head>
	<title>Docker Settings - Arcane</title>
</svelte:head>

<RegistryFormDialog bind:open={isRegistryDialogOpen} bind:credentialToEdit={registryToEdit} onSubmit={handleRegistryDialogSubmit} isLoading={isLoadingRegistryAction} />

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Docker Settings</h1>
			<p class="text-sm text-muted-foreground mt-1">Configure Docker connection, registries, and automation</p>
		</div>

		<Button onclick={() => handleDockerSettingUpdates()} disabled={isLoading.saving} class="h-10 arcane-button-save">
			{#if isLoading.saving}
				<RefreshCw class="animate-spin size-4" />
				Saving...
			{:else}
				<Save class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

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
						<FormInput bind:input={dockerHostInput} type="text" id="dockerHost" label="Docker Host" placeholder="unix:///var/run/docker.sock" description="For local Docker: unix:///var/run/docker.sock (Unix)" />
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
							<Button onclick={openCreateRegistryDialog} class="arcane-button-save">
								<Plus class="size-4" /> Add Registry
							</Button>
						</div>

						<div class="space-y-2">
							{#if !currentSettings.registryCredentials || currentSettings.registryCredentials.length === 0}
								<div class="text-center py-8 text-muted-foreground italic border rounded-md">No registry credentials configured yet.</div>
							{:else}
								<UniversalTable
									data={currentRegistries}
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
						<FormInput bind:input={pollingEnabledSwitch} type="switch" id="pollingEnabled" label="Check for New Images" description="Periodically check for newer versions of container images" />
					</div>

					{#if currentSettings.pollingEnabled}
						<div class="space-y-2 px-1">
							<FormInput bind:input={pollingIntervalInput} type="number" id="pollingInterval" label="Polling Interval (Minutes)" placeholder="60" description="Set between 5-60 minutes." />
						</div>

						<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
							<FormInput bind:input={autoUpdateSwitch} type="switch" id="autoUpdateSwitch" label="Auto Update Containers" description="Automatically update containers when newer images are available" />
						</div>

						{#if currentSettings.autoUpdate}
							<div class="space-y-2 mt-4">
								<FormInput bind:input={autoUpdateIntervalInput} type="number" id="autoUpdateInterval" label="Auto-update check interval (minutes)" placeholder="60" description="How often Arcane will check for container and stack updates (minimum 5 minutes, maximum 24 hours)" />
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
							value={currentSettings.pruneMode}
							onValueChange={(val) => {
								settingsAPI.updateSettings({
									...currentSettings,
									pruneMode: val as 'all' | 'dangling'
								});
								settingsStore.reload();
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

	<!-- Hidden CSRF token if needed -->
	<input type="hidden" id="csrf_token" value={data.csrf} />
</div>
