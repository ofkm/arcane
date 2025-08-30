<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ServerIcon from '@lucide/svelte/icons/server';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import TestTubeIcon from '@lucide/svelte/icons/test-tube';
	import * as Card from '$lib/components/ui/card';
	import { environmentManagementAPI } from '$lib/services/api';
	import type { Environment } from '$lib/stores/environment.store';
	import type { CreateEnvironmentDTO } from '$lib/types/environment.type';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';

	type NewEnvironmentSheetProps = {
		open: boolean;
		onEnvironmentCreated?: () => void;
	};

	let { open = $bindable(false), onEnvironmentCreated }: NewEnvironmentSheetProps = $props();

	let environments = $state<Environment[]>([]);
	let loading = $state(false);
	let isSubmitting = $state(false);

	const formSchema = z.object({
		hostname: z.string().min(1, 'Hostname is required').max(100, 'Hostname too long'),
		apiUrl: z.string().url('Must be a valid URL').min(1, 'API URL is required'),
		description: z.string().optional(),
		enabled: z.boolean().default(true)
	});

	let formData = $state({
		hostname: '',
		apiUrl: '',
		description: '',
		enabled: true
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	onMount(async () => {
		await loadEnvironments();
	});

	async function loadEnvironments() {
		try {
			loading = true;
			environments = await environmentManagementAPI.list();
		} catch (error) {
			toast.error('Failed to load environments');
			console.error(error);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		try {
			isSubmitting = true;
			const dto: CreateEnvironmentDTO = {
				hostname: data.hostname,
				apiUrl: data.apiUrl,
				description: data.description
			};

			await environmentManagementAPI.create(dto);
			toast.success('Environment created successfully');

			form.reset();
			await loadEnvironments();
			onEnvironmentCreated?.();
		} catch (error) {
			toast.error('Failed to create environment');
			console.error(error);
		} finally {
			isSubmitting = false;
		}
	}

	async function deleteEnvironment(environmentId: string) {
		if (!confirm('Are you sure you want to delete this environment?')) {
			return;
		}

		try {
			await environmentManagementAPI.delete(environmentId);
			toast.success('Environment deleted successfully');
			await loadEnvironments();
		} catch (error) {
			toast.error('Failed to delete environment');
			console.error(error);
		}
	}

	async function testConnection(environmentId: string) {
		try {
			const result = await environmentManagementAPI.testConnection(environmentId);
			if (result.status === 'online') {
				toast.success('Connection successful');
			} else {
				toast.error(`Connection failed: ${result.message || 'Unknown error'}`);
			}
		} catch (error) {
			toast.error('Failed to test connection');
			console.error(error);
		}
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			form.reset();
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content class="w-full p-6 sm:max-w-lg">
		<Sheet.Header class="space-y-3 border-b pb-6">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
					<ServerIcon class="text-primary size-5" />
				</div>
				<div>
					<Sheet.Title class="text-xl font-semibold">Manage Environments</Sheet.Title>
					<Sheet.Description class="text-muted-foreground mt-1 text-sm"
						>Add and manage remote Docker environments. Each environment should be an Arcane agent running as an API server.</Sheet.Description
					>
				</div>
			</div>
		</Sheet.Header>

		<div class="space-y-6 py-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Add New Environment</Card.Title>
				</Card.Header>
				<Card.Content>
					<form onsubmit={preventDefault(handleSubmit)} class="space-y-4">
						<FormInput
							label="Hostname *"
							type="text"
							placeholder="docker-host-1"
							description="Display name for this environment"
							bind:input={$inputs.hostname}
						/>

						<FormInput
							label="API URL *"
							type="text"
							placeholder="http://192.168.1.100:3552"
							description="Full URL to the agent's API endpoint"
							bind:input={$inputs.apiUrl}
						/>

						<FormInput
							label="Description"
							type="text"
							placeholder="Production Docker host"
							description="Optional description for this environment"
							bind:input={$inputs.description}
						/>

						<SwitchWithLabel
							id="enabledSwitch"
							label="Enabled"
							description="Enable this environment for use"
							bind:checked={$inputs.enabled.value}
						/>

						<Button type="submit" class="w-full" disabled={isSubmitting}>
							{#if isSubmitting}
								<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
							{/if}
							Add Environment
						</Button>
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Existing Environments</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if loading}
						<div class="py-4 text-center">
							<LoaderCircleIcon class="mx-auto size-4 animate-spin" />
						</div>
					{:else if environments.length === 0}
						<div class="text-muted-foreground py-4 text-center">No environments configured</div>
					{:else}
						<div class="space-y-3">
							{#each environments as environment}
								<div class="flex items-center justify-between rounded-lg border p-3">
									<div class="min-w-0 flex-1">
										<div class="truncate font-medium">{environment.hostname}</div>
										<div class="text-muted-foreground truncate text-sm">{environment.apiUrl}</div>
										<div class="mt-1 flex items-center gap-2">
											<span
												class="rounded-full px-2 py-1 text-xs {environment.status === 'online'
													? 'bg-green-100 text-green-800'
													: 'bg-red-100 text-red-800'}"
											>
												{environment.status}
											</span>
										</div>
									</div>
									<div class="ml-2 flex items-center gap-2">
										<Button variant="outline" size="sm" onclick={() => testConnection(environment.id)}>
											<TestTubeIcon class="h-4 w-4" />
										</Button>
										<Button variant="destructive" size="sm" onclick={() => deleteEnvironment(environment.id)}>
											<Trash2Icon class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</Sheet.Content>
</Sheet.Root>
