<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Save, RefreshCw, Key, Plus, Trash2, ImageMinus } from '@lucide/svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { ActionData, PageData } from '../$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	let settings = $derived(data.settings);

	// Update form values from form.values if there was an error, otherwise from settings
	let dockerHost = $derived(form?.values?.dockerHost || settings?.dockerHost || '');

	let pollingEnabled = $derived(form?.values?.pollingEnabled !== undefined ? form.values.pollingEnabled === 'on' : settings?.pollingEnabled || false);

	let pollingInterval = $derived(form?.values?.pollingInterval !== undefined ? Number(form.values.pollingInterval) : settings?.pollingInterval || 10);
	let autoUpdateInterval = $derived(form?.values?.autoUpdateInterval !== undefined ? Number(form.values.autoUpdateInterval) : settings?.autoUpdateInterval || 10);

	let stacksDirectory = $derived(form?.values?.stacksDirectory || settings?.stacksDirectory || '');
	let autoUpdate = $derived(form?.values?.autoUpdate !== undefined ? form.values.autoUpdate === 'on' : settings?.autoUpdate || false);

	let pruneMode = $derived<'all' | 'dangling'>(form?.values?.pruneMode || settings?.pruneMode || 'all');

	let registryCredentials = $derived(typeof form?.values?.registryCredentials === 'string' ? JSON.parse(form.values.registryCredentials) : form?.values?.registryCredentials || settings?.registryCredentials || []);

	const defaultRegistry = { url: '', username: '', password: '' };

	function addRegistry() {
		registryCredentials = [...registryCredentials, { ...defaultRegistry }];
	}

	function removeRegistry(index: number) {
		registryCredentials = registryCredentials.filter((_: unknown, i: number) => i !== index);
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<!-- Docker Connection Card -->
	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-blue-500/10 p-2 rounded-full">
					<Save class="h-5 w-5 text-blue-500" />
				</div>
				<div>
					<Card.Title>Docker Settings</Card.Title>
					<Card.Description>Configure your Docker connection</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<div class="space-y-2">
					<label for="dockerHost" class="text-sm font-medium">Docker Host</label>
					<Input type="text" id="dockerHost" name="dockerHost" bind:value={dockerHost} placeholder="unix:///var/run/docker.sock" required />
					<p class="text-xs text-muted-foreground">For local Docker: unix:///var/run/docker.sock (Unix) or npipe:////./pipe/docker_engine (Windows)</p>
				</div>

				<div class="space-y-2">
					<label for="stacksDirectory" class="text-sm font-medium">Stacks Directory</label>
					<Input type="text" id="stacksDirectory" name="stacksDirectory" bind:value={stacksDirectory} placeholder="/app/data/stacks" required />
					<p class="text-xs text-muted-foreground">Directory where Docker Compose stacks will be stored inside the container.</p>
					<p class="text-xs font-bold text-destructive">Changing this setting will not move existing stacks!</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="space-y-6">
		<!-- Polling Settings Card -->
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-amber-500/10 p-2 rounded-full">
						<RefreshCw class="h-5 w-5 text-amber-500" />
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
					<Switch id="pollingEnabledSwitch" name="pollingEnabled" bind:checked={pollingEnabled} />
				</div>

				{#if pollingEnabled}
					<div class="space-y-2 px-1">
						<label for="pollingInterval" class="text-sm font-medium"> Polling Interval (minutes) </label>
						<Input id="pollingInterval" name="pollingInterval" type="number" bind:value={pollingInterval} min="5" max="60" />
						{#if form?.error && form.values?.pollingInterval && (parseInt(String(form.values.pollingInterval), 10) < 5 || parseInt(String(form.values.pollingInterval), 10) > 60)}
							<p class="text-sm text-destructive">Must be between 5 and 60 minutes.</p>
						{:else}
							<p class="text-xs text-muted-foreground">Set between 5-60 minutes.</p>
						{/if}
					</div>

					<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
						<div class="space-y-0.5">
							<Label for="autoUpdateSwitch" class="text-base font-medium">Auto Update Containers</Label>
							<p class="text-sm text-muted-foreground">Automatically update containers when newer images are available</p>
						</div>
						<Switch id="autoUpdateSwitch" name="autoUpdate" bind:checked={autoUpdate} />
					</div>

					{#if autoUpdate}
						<div class="space-y-2 mt-4">
							<Label for="autoUpdateInterval" class="text-base font-medium">Auto-update check interval (minutes)</Label>
							<Input id="autoUpdateInterval" name="autoUpdateInterval" type="number" min="5" max="1440" bind:value={autoUpdateInterval} />
							<p class="text-sm text-muted-foreground">How often Arcane will check for container and stack updates (minimum 5 minutes, maximum 24 hours)</p>
						</div>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Prune Settings Card -->
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-purple-500/10 p-2 rounded-full">
						<ImageMinus class="h-5 w-5 text-purple-500" />
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
					<RadioGroup.Root bind:value={pruneMode} name="pruneMode" class="flex flex-col space-y-1" id="pruneMode">
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

	<!-- Docker Registry Credentials Card -->
	<Card.Root class="border shadow-sm lg:col-span-2">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-green-500/10 p-2 rounded-full">
					<Key class="h-5 w-5 text-green-500" />
				</div>
				<div>
					<Card.Title>Docker Registry Credentials</Card.Title>
					<Card.Description>Configure access to private Docker registries</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<div class="space-y-2">
					<p class="text-sm text-muted-foreground">Add credentials for private registries like Docker Hub, GitHub Container Registry (ghcr.io), or other private repositories.</p>

					{#if registryCredentials.length === 0}
						<div class="text-center py-4 text-muted-foreground text-sm border rounded-md">No registry credentials configured yet</div>
					{:else}
						<div class="space-y-4">
							{#each registryCredentials as registry, index}
								<div class="border rounded-md p-4 space-y-3">
									<div class="flex justify-between items-center">
										<h4 class="font-medium">Registry #{index + 1}</h4>
										<button type="button" class="text-destructive hover:text-destructive/80" onclick={() => removeRegistry(index)}>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>

									<div class="space-y-2">
										<label for={`registry-url-${index}`} class="text-sm font-medium">Registry URL</label>
										<Input type="text" id={`registry-url-${index}`} name={`registryCredentials[${index}].url`} bind:value={registry.url} placeholder="ghcr.io, registry.hub.docker.com, etc." required />
									</div>

									<div class="space-y-2">
										<label for={`registry-username-${index}`} class="text-sm font-medium">Username</label>
										<Input type="text" id={`registry-username-${index}`} name={`registryCredentials[${index}].username`} bind:value={registry.username} placeholder="Username" required />
									</div>

									<div class="space-y-2">
										<label for={`registry-password-${index}`} class="text-sm font-medium">Password / Access Token</label>
										<Input type="password" id={`registry-password-${index}`} name={`registryCredentials[${index}].password`} bind:value={registry.password} placeholder="Password or access token" required />
										<p class="text-xs text-muted-foreground">For GitHub, use a personal access token with the appropriate scopes.</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<button type="button" class="w-full mt-4 flex items-center justify-center gap-2 border border-dashed rounded-md py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30" onclick={addRegistry}>
						<Plus class="h-4 w-4" /> Add Registry Credentials
					</button>

					<p class="text-xs text-muted-foreground mt-2">
						Common registry URLs:
						<span class="font-medium">registry.hub.docker.com</span> (Docker Hub),
						<span class="font-medium">ghcr.io</span> (GitHub Container Registry),
						<span class="font-medium">[account].dkr.ecr.[region].amazonaws.com</span> (AWS ECR)
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
