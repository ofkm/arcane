<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import { Loader2, Upload, FileText } from '@lucide/svelte';

	interface StackDeploymentData {
		mode: 'compose' | 'template' | 'existing';
		stackName: string;
		composeContent: string;
		envContent: string;
		selectedStack?: string;
	}

	interface StackTemplate {
		id: string;
		name: string;
		description: string;
		compose: string;
	}

	interface Props {
		agentId: string;
		onClose: () => void;
		onDeploy: (data: StackDeploymentData) => Promise<void>;
	}

	let { agentId, onClose, onDeploy }: Props = $props();

	let deploying = $state(false);
	let deploymentMode = $state<StackDeploymentData['mode']>('compose');
	let stackName = $state('');
	let composeContent = $state('');
	let envContent = $state('');
	let selectedStack = $state('');

	// Pre-made templates for easy deployment
	const templates: StackTemplate[] = [
		{
			id: 'nginx',
			name: 'Nginx Web Server',
			description: 'Simple Nginx web server',
			compose: `version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped`
		},
		{
			id: 'redis',
			name: 'Redis Cache',
			description: 'Redis in-memory database',
			compose: `version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis_data:`
		},
		{
			id: 'postgres',
			name: 'PostgreSQL Database',
			description: 'PostgreSQL database server',
			compose: `version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: changeme
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:`
		}
	];

	function useTemplate(template: StackTemplate) {
		stackName = template.name.toLowerCase().replace(/\s+/g, '-');
		composeContent = template.compose;
		deploymentMode = 'compose';
	}

	async function handleDeploy() {
		// Comprehensive validation
		if (!stackName.trim()) {
			toast.error('Please enter a stack name');
			return;
		}

		// Validate stack name format
		const stackNameRegex = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/;
		const trimmedStackName = stackName.trim().toLowerCase();
		if (!stackNameRegex.test(trimmedStackName)) {
			toast.error('Stack name must start with a letter, contain only lowercase letters, numbers, and hyphens, and not end with a hyphen');
			return;
		}

		if (trimmedStackName.length > 63) {
			toast.error('Stack name must be 63 characters or less');
			return;
		}

		// Reserved stack names
		const reservedNames = ['system', 'docker', 'default', 'admin', 'root', 'api'];
		if (reservedNames.includes(trimmedStackName)) {
			toast.error(`"${trimmedStackName}" is a reserved name. Please choose a different stack name`);
			return;
		}

		// Mode-specific validation
		if (deploymentMode === 'compose') {
			if (!composeContent.trim()) {
				toast.error('Please enter Docker Compose content');
				return;
			}

			// Basic YAML validation
			try {
				// Check if it looks like valid YAML (basic structure check)
				const lines = composeContent.trim().split('\n');
				const firstLine = lines[0].trim();

				// Should have version or services
				if (!firstLine.startsWith('version:') && !composeContent.includes('services:')) {
					toast.error('Compose content should include a version and services section');
					return;
				}

				// Check for common YAML issues
				if (composeContent.includes('\t')) {
					toast.error('Compose content contains tabs. Please use spaces for indentation');
					return;
				}

				// Check for required services section
				if (!composeContent.includes('services:')) {
					toast.error('Compose content must include a "services:" section');
					return;
				}

				// Basic service definition check
				const servicesMatch = composeContent.match(/services:\s*\n([\s\S]*?)(?=\n\w|\n$|$)/);
				if (servicesMatch) {
					const servicesSection = servicesMatch[1];
					const serviceLines = servicesSection.split('\n').filter((line) => line.trim() && !line.startsWith(' '));

					if (serviceLines.length === 0) {
						toast.error('At least one service must be defined in the services section');
						return;
					}
				}
			} catch (error) {
				toast.error('Invalid Docker Compose format. Please check your YAML syntax');
				return;
			}

			// Validate environment variables format if provided
			if (envContent.trim()) {
				const envLines = envContent.trim().split('\n');
				for (let i = 0; i < envLines.length; i++) {
					const line = envLines[i].trim();
					if (!line) continue; // Skip empty lines

					// Should be in KEY=VALUE format
					if (!line.includes('=')) {
						toast.error(`Environment variable line ${i + 1} must be in KEY=VALUE format`);
						return;
					}

					const [key, ...valueParts] = line.split('=');
					if (!key.trim()) {
						toast.error(`Environment variable line ${i + 1} is missing a key`);
						return;
					}

					// Validate environment variable key format
					const envKeyRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
					if (!envKeyRegex.test(key.trim())) {
						toast.error(`Environment variable "${key}" must start with letter or underscore and contain only letters, numbers, and underscores`);
						return;
					}
				}
			}
		} else if (deploymentMode === 'template') {
			// For template mode, ensure a template was selected (composeContent should be populated)
			if (!composeContent.trim()) {
				toast.error('Please select a template first');
				return;
			}
		} else if (deploymentMode === 'existing') {
			if (!selectedStack.trim()) {
				toast.error('Please select an existing stack');
				return;
			}
		}

		deploying = true;
		try {
			const data: StackDeploymentData = {
				mode: deploymentMode,
				stackName: trimmedStackName,
				composeContent: composeContent.trim(),
				envContent: envContent.trim(),
				selectedStack: selectedStack.trim() || undefined
			};

			console.log(`🚀 Deploying stack "${trimmedStackName}" with mode "${deploymentMode}"`);
			await onDeploy(data);
			onClose();
			toast.success(`Stack "${trimmedStackName}" deployed successfully`);
		} catch (err) {
			console.error('Deploy error:', err);

			// Enhanced error handling with specific error types
			if (err instanceof Error) {
				const errorMessage = err.message.toLowerCase();

				// Network/connectivity errors
				if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
					toast.error('Network error: Unable to connect to the deployment service. Please check your connection and try again.');
					return;
				}

				// Permission/authentication errors
				if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
					toast.error('Permission denied: You may not have sufficient permissions to deploy stacks.');
					return;
				}

				// Stack already exists
				if (errorMessage.includes('already exists') || errorMessage.includes('conflict')) {
					toast.error(`Stack "${trimmedStackName}" already exists. Please choose a different name or remove the existing stack first.`);
					return;
				}

				// Docker/compose specific errors
				if (errorMessage.includes('yaml') || errorMessage.includes('compose') || errorMessage.includes('invalid')) {
					toast.error('Invalid Docker Compose configuration. Please check your compose content and try again.');
					return;
				}

				// Resource errors
				if (errorMessage.includes('memory') || errorMessage.includes('disk') || errorMessage.includes('resource')) {
					toast.error('Insufficient resources: The deployment requires more memory, disk space, or other resources than available.');
					return;
				}

				// Image pull errors
				if (errorMessage.includes('pull') || errorMessage.includes('image') || errorMessage.includes('registry')) {
					toast.error('Image error: Unable to pull required Docker images. Please check image names and registry availability.');
					return;
				}

				// Port binding errors
				if (errorMessage.includes('port') || errorMessage.includes('bind') || errorMessage.includes('address already in use')) {
					toast.error('Port conflict: One or more ports are already in use. Please check your port mappings.');
					return;
				}

				// Volume/mount errors
				if (errorMessage.includes('volume') || errorMessage.includes('mount') || errorMessage.includes('path')) {
					toast.error('Volume error: There was an issue with volume mounts or paths. Please check your volume configurations.');
					return;
				}

				// Agent-specific errors
				if (errorMessage.includes('agent') || errorMessage.includes('offline')) {
					toast.error('Agent error: The target agent is offline or unavailable. Please try again later.');
					return;
				}

				// Generic error with the actual message
				toast.error(`Deployment failed: ${err.message}`);
			} else {
				// Non-Error objects
				console.error('Unknown error type:', err);
				toast.error('An unexpected error occurred during deployment. Please try again.');
			}
		} finally {
			deploying = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Deployment Mode Selection -->
	<div class="space-y-3">
		<Label>How would you like to deploy?</Label>
		<div class="grid grid-cols-3 gap-2">
			<Button variant={deploymentMode === 'compose' ? 'default' : 'outline'} size="sm" onclick={() => (deploymentMode = 'compose')} class="flex flex-col h-auto p-3">
				<FileText class="size-4 mb-1" />
				<span class="text-xs">Write Compose</span>
			</Button>
			<Button variant={deploymentMode === 'template' ? 'default' : 'outline'} size="sm" onclick={() => (deploymentMode = 'template')} class="flex flex-col h-auto p-3">
				<Upload class="size-4 mb-1" />
				<span class="text-xs">Use Template</span>
			</Button>
			<Button variant={deploymentMode === 'existing' ? 'default' : 'outline'} size="sm" onclick={() => (deploymentMode = 'existing')} class="flex flex-col h-auto p-3" disabled>
				<FileText class="size-4 mb-1" />
				<span class="text-xs">Existing Stack</span>
			</Button>
		</div>
	</div>

	{#if deploymentMode === 'template'}
		<!-- Template Selection -->
		<div class="space-y-3">
			<Label>Choose a template</Label>
			<div class="grid gap-2">
				{#each templates as template}
					<button class="p-3 text-left border rounded-lg hover:border-primary/50 transition-colors" onclick={() => useTemplate(template)}>
						<div class="font-medium text-sm">{template.name}</div>
						<div class="text-xs text-muted-foreground">{template.description}</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Stack Name -->
	<div class="space-y-2">
		<Label for="stackName">Stack Name</Label>
		<Input id="stackName" bind:value={stackName} placeholder="my-awesome-app" disabled={deploying} />
	</div>

	{#if deploymentMode === 'compose'}
		<!-- Compose Content -->
		<div class="space-y-2">
			<Label for="compose">Docker Compose Content</Label>
			<Textarea id="compose" bind:value={composeContent} placeholder="version: '3.8'&#10;services:&#10;  web:&#10;    image: nginx:alpine&#10;    ports:&#10;      - '80:80'" class="font-mono text-sm min-h-[200px]" disabled={deploying} />
		</div>

		<!-- Environment Variables (Optional) -->
		<div class="space-y-2">
			<Label for="env">Environment Variables (Optional)</Label>
			<Textarea id="env" bind:value={envContent} placeholder="DATABASE_URL=postgres://user:pass@db:5432/myapp&#10;REDIS_URL=redis://redis:6379" class="font-mono text-sm min-h-[80px]" disabled={deploying} />
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex justify-end space-x-2">
		<Button variant="outline" onclick={onClose} disabled={deploying}>Cancel</Button>
		<Button onclick={handleDeploy} disabled={deploying || !stackName.trim()}>
			{#if deploying}
				<Loader2 class="size-4 mr-2 animate-spin" />
			{/if}
			Deploy Stack
		</Button>
	</div>
</div>
