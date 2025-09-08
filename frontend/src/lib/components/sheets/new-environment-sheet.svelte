<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
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
		apiUrl: z.url('Must be a valid URL').min(1, 'Server URL is required'),
		accessToken: z.string().optional(),
		bootstrapToken: z.string().optional()
	});

	let formData = $state({
		apiUrl: '',
		accessToken: '',
		bootstrapToken: ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

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
				apiUrl: data.apiUrl,
				accessToken: data.accessToken || undefined,
				bootstrapToken: data.bootstrapToken || undefined
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
						>Add and manage remote Arcane servers (headless backend, no frontend). Provide the server endpoint.</Sheet.Description
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
							label="Server URL *"
							type="text"
							placeholder="http://192.168.1.100:3553"
							description="Full URL to the Arcane server endpoint"
							bind:input={$inputs.apiUrl}
						/>

						<FormInput
							label="Agent Token (optional)"
							type="password"
							placeholder="Paste token from agent"
							description="If provided, manager will use this token for all proxied requests"
							bind:input={$inputs.accessToken}
						/>

						<FormInput
							label="Bootstrap Token (optional)"
							type="password"
							placeholder="AGENT_BOOTSTRAP_TOKEN from the agent"
							description="If provided, manager will auto‑pair with the agent and store the generated token"
							bind:input={$inputs.bootstrapToken}
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
		</div>
	</Sheet.Content>
</Sheet.Root>
