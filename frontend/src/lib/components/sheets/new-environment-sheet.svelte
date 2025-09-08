<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ServerIcon from '@lucide/svelte/icons/server';
	import * as Card from '$lib/components/ui/card';
	import { environmentManagementAPI } from '$lib/services/api';
	import type { CreateEnvironmentDTO } from '$lib/types/environment.type';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';

	type NewEnvironmentSheetProps = {
		open: boolean;
		onEnvironmentCreated?: () => void;
	};

	let { open = $bindable(false), onEnvironmentCreated }: NewEnvironmentSheetProps = $props();

	let isSubmitting = $state(false);

	const formSchema = z.object({
		name: z.string().min(1, 'Name is required').max(25, 'Name too long'),
		apiUrl: z.url('Must be a valid URL').min(1, 'Server URL is required'),
		bootstrapToken: z.string()
	});

	let formData = $state({
		name: '',
		apiUrl: '',
		bootstrapToken: ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	async function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		try {
			isSubmitting = true;

			const dto: CreateEnvironmentDTO = {
				name: data.name,
				apiUrl: data.apiUrl,
				bootstrapToken: data.bootstrapToken
			};

			const created = await environmentManagementAPI.create(dto);

			try {
				const result = await environmentManagementAPI.testConnection(created.id);
				if (result.status === 'online') {
					toast.success('Environment is online');
				} else {
					toast.warning('Environment appears offline');
				}
			} catch (e) {
				console.error(e);
				toast.error('Environment test failed');
			}

			toast.success('Environment created successfully');

			form.reset();
			onEnvironmentCreated?.();
		} catch (error) {
			toast.error('Failed to create environment');
			console.error(error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content class="w-full p-6 sm:max-w-lg">
		<Sheet.Header class="space-y-3 border-b pb-6">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
					<ServerIcon class="text-primary size-5" />
				</div>
				<div>
					<Sheet.Title class="text-xl font-semibold">Manage Environments</Sheet.Title>
					<Sheet.Description class="text-muted-foreground mt-1 text-sm"
						>Add and manage remote Arcane servers in Agent Mode.</Sheet.Description
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
						<FormInput label="Name" placeholder="My Lab Server" bind:input={$inputs.name} />

						<FormInput
							label="Server URL *"
							type="text"
							placeholder="http://192.168.1.100:3553"
							description="Full URL to the Arcane server endpoint"
							bind:input={$inputs.apiUrl}
						/>

						<FormInput
							label="Bootstrap Token"
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
