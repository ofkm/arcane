<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, FileStack, Terminal, Copy, Loader2, Wand, Send } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { preventDefault } from '$lib/utils/form.utils';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import EnvEditor from '$lib/components/env-editor.svelte';
	import { defaultEnvTemplate, defaultComposeTemplate } from '$lib/constants';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import DropdownCard from '$lib/components/dropdown-card.svelte';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import TemplateSelectionDialog from '$lib/components/template-selection-dialog.svelte';
	import type { ComposeTemplate } from '$lib/services/template-service';
	import type { PageData } from './$types';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { Agent } from '$lib/types/agent.type';

	let { data }: { data: PageData } = $props();

	const stackApi = new StackAPIService();
	let saving = $state(false);
	let converting = $state(false);
	let showTemplateDialog = $state(false);
	let deployToAgent = $state(false);
	let selectedAgentId = $state('');
	let selectedAgent: Agent | undefined = $state();

	let name = $state('');
	let composeContent = $state(defaultComposeTemplate);
	let envContent = $state(data.envTemplate || defaultEnvTemplate);
	let dockerRunCommand = $state('');

	// Get online agents for deployment
	const onlineAgents = $derived(data.agents || []);
	// Initialize with default template if available
	$effect(() => {
		if (data.defaultTemplate && !composeContent) {
			composeContent = data.defaultTemplate;
		}
	});

	// Update selectedAgentId when selectedAgent changes
	$effect(() => {
		selectedAgentId = selectedAgent?.id || '';
	});

	async function handleSubmit() {
		if (deployToAgent && selectedAgentId) {
			await handleDeployToAgent();
		} else {
			await handleCreateStack();
		}
	}

	async function handleCreateStack() {
		handleApiResultWithCallbacks({
			result: await tryCatch(stackApi.create(name, composeContent, envContent)),
			message: 'Failed to Create Stack',
			setLoadingState: (value) => (saving = value),
			onSuccess: async () => {
				toast.success(`Stack "${name}" created with environment file.`);
				await invalidateAll();
				goto(`/stacks/${name}`);
			}
		});
	}

	async function handleDeployToAgent() {
		if (!selectedAgentId) {
			toast.error('Please select an agent for deployment');
			return;
		}

		const selectedAgent = onlineAgents.find((agent) => agent.id === selectedAgentId);
		if (!selectedAgent) {
			toast.error('Selected agent not found or offline');
			return;
		}

		saving = true;
		try {
			const response = await fetch(`/api/agents/${selectedAgentId}/deploy/stack`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					stackName: name,
					composeContent,
					envContent,
					mode: 'compose'
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Failed to deploy stack: ${response.statusText}`);
			}

			const result = await response.json();
			toast.success(`Stack "${name}" deployed to agent ${selectedAgent.hostname}!`);
			goto(`/agents/${selectedAgentId}`);
		} catch (error) {
			console.error('Deploy error:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to deploy stack');
		} finally {
			saving = false;
		}
	}

	async function handleConvertDockerRun() {
		if (!dockerRunCommand.trim()) {
			toast.error('Please enter a docker run command');
			return;
		}

		handleApiResultWithCallbacks({
			result: await tryCatch(stackApi.convertDockerRun(dockerRunCommand)),
			message: 'Failed to Convert Docker Run Command',
			setLoadingState: (value) => (converting = value),
			onSuccess: (data) => {
				const { dockerCompose, envVars, serviceName } = data;

				composeContent = dockerCompose;
				if (envVars) {
					envContent = envVars;
				}
				if (serviceName && !name) {
					name = serviceName;
				}

				toast.success('Docker run command converted successfully!');
				// Clear the command after successful conversion
				dockerRunCommand = '';
			}
		});
	}

	function handleTemplateSelect(template: ComposeTemplate) {
		composeContent = template.content;

		// If template has environment content, use it
		if (template.envContent) {
			envContent = template.envContent;
		}

		// Auto-populate name if empty
		if (!name.trim()) {
			name = template.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		}

		toast.success(`Template "${template.name}" loaded successfully!`);
	}

	const exampleCommands = ['docker run -d --name nginx -p 8080:80 -v nginx_data:/usr/share/nginx/html nginx:alpine', 'docker run -d --name postgres -e POSTGRES_DB=mydb -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -v postgres_data:/var/lib/postgresql/data postgres:15', 'docker run -d --name redis -p 6379:6379 --restart unless-stopped redis:alpine'];

	function useExample(command: string) {
		dockerRunCommand = command;
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/stacks">Stacks</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>New Stack</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<h1 class="text-2xl font-bold tracking-tight mt-2">Create New Stack</h1>
		</div>
	</div>

	<!-- Docker Run to Compose Converter -->
	<DropdownCard id="docker-run-converter" title="Docker Run to Compose Converter" description="Convert existing docker run commands to Docker Compose format" icon={Terminal}>
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="dockerRunCommand">Docker Run Command</Label>
				<Textarea id="dockerRunCommand" bind:value={dockerRunCommand} placeholder="docker run -d --name my-app -p 8080:80 nginx:alpine" rows={3} disabled={converting} class="font-mono text-sm" />
			</div>

			<div class="flex items-center gap-2">
				<Button type="button" disabled={!dockerRunCommand.trim() || converting} size="sm" onclick={handleConvertDockerRun}>
					{#if converting}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Converting...
					{:else}
						<Wand class="mr-2 size-4" />
						Convert to Compose
					{/if}
				</Button>
			</div>

			<div class="space-y-2">
				<Label class="text-xs text-muted-foreground">Example Commands:</Label>
				<div class="space-y-1">
					{#each exampleCommands as command}
						<Button type="button" variant="ghost" size="sm" class="h-auto p-2 text-xs font-mono text-left justify-start w-full" onclick={() => useExample(command)}>
							<Copy class="mr-2 size-3" />
							{command}
						</Button>
					{/each}
				</div>
			</div>
		</div>
	</DropdownCard>

	<form class="space-y-6" onsubmit={preventDefault(handleSubmit)}>
		<Card.Root class="border shadow-sm">
			<Card.Header>
				<div class="flex items-center justify-between w-full">
					<div class="flex items-center gap-3">
						<div class="bg-primary/10 p-2 rounded-full">
							<FileStack class="text-primary size-5" />
						</div>
						<div>
							<Card.Title>Stack Configuration</Card.Title>
							<Card.Description>Create a new Docker Compose stack with environment variables</Card.Description>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<!-- Agent Selection moved here -->
						{#if onlineAgents.length > 0}
							<div class="flex items-center gap-2">
								<input type="checkbox" id="deployToAgent" bind:checked={deployToAgent} disabled={saving} class="rounded border-gray-300" />
								<Label for="deployToAgent" class="text-sm font-medium whitespace-nowrap">Deploy to Agent</Label>
								{#if deployToAgent}
									<Select.Root type="single" bind:value={selectedAgentId} disabled={saving}>
										<Select.Trigger class="w-[180px]">
											<span class="text-sm">
												{onlineAgents.find((agent) => agent.id === selectedAgentId)?.hostname || 'Select agent...'}
											</span>
										</Select.Trigger>
										<Select.Content>
											{#each onlineAgents as agent}
												<Select.Item value={agent.id}>
													{agent.hostname} ({agent.platform})
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								{/if}
							</div>
						{/if}

						<ArcaneButton action="template" onClick={() => (showTemplateDialog = true)} loading={saving} disabled={saving || converting} />
						{#if deployToAgent}
							<Button type="submit" disabled={!name || !composeContent || !selectedAgentId || saving}>
								{#if saving}
									<Loader2 class="size-4 mr-2 animate-spin" />
								{:else}
									<Send class="size-4 mr-2" />
								{/if}
								Deploy to Agent
							</Button>
						{:else}
							<ArcaneButton action="create" onClick={handleSubmit} loading={saving} disabled={!name || !composeContent} />
						{/if}
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="grid w-full max-w-sm items-center gap-1.5">
						<Label for="name">Stack Name</Label>
						<Input type="text" id="name" name="name" bind:value={name} required placeholder="e.g., my-web-app" disabled={saving} />
					</div>

					<Resizable.PaneGroup direction="horizontal">
						<Resizable.Pane>
							<div class="space-y-2 mr-3">
								<Label for="compose-editor" class="mb-2">Docker Compose File</Label>
								<div class="border rounded-md overflow-hidden mt-2 h-[550px]">
									<YamlEditor bind:value={composeContent} readOnly={saving} />
								</div>
								<p class="text-xs text-muted-foreground">Enter a valid compose.yaml file or choose from templates using the "Use Template" button above.</p>
							</div>
						</Resizable.Pane>
						<Resizable.Handle />
						<Resizable.Pane defaultSize={25}>
							<div class="space-y-2 ml-3">
								<Label for="env-editor" class="mb-2">Environment Configuration (.env)</Label>
								<div class="border rounded-md overflow-hidden mt-2 h-[550px]">
									<EnvEditor bind:value={envContent} readOnly={saving} />
								</div>
								<p class="text-xs text-muted-foreground">
									{#if data.envTemplate}
										Environment variables loaded from template. Modify as needed.
									{:else}
										Define environment variables in KEY=value format. These will be saved as a .env file in the stack directory.
									{/if}
								</p>
							</div>
						</Resizable.Pane>
					</Resizable.PaneGroup>
				</div>
			</Card.Content>
			<Card.Footer class="flex justify-between">
				<Button variant="outline" type="button" onclick={() => window.history.back()} disabled={saving}>
					<ArrowLeft class="mr-2 size-4" />
					Cancel
				</Button>
			</Card.Footer>
		</Card.Root>
	</form>
</div>

<!-- Template Selection Dialog -->
<TemplateSelectionDialog bind:open={showTemplateDialog} templates={data.composeTemplates || []} onSelect={handleTemplateSelect} />
