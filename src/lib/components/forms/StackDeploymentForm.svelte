<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import { Loader2, Upload, FileText } from '@lucide/svelte';

	interface Props {
		agentId: string;
		onClose: () => void;
		onDeploy: (data: any) => Promise<void>;
	}

	let { agentId, onClose, onDeploy }: Props = $props();

	let deploying = $state(false);
	let deploymentMode = $state('compose'); // 'compose' | 'existing' | 'template'
	let stackName = $state('');
	let composeContent = $state('');
	let envContent = $state('');
	let selectedStack = $state('');

	// Pre-made templates for easy deployment
	const templates = [
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

	function useTemplate(template: any) {
		stackName = template.name.toLowerCase().replace(/\s+/g, '-');
		composeContent = template.compose;
		deploymentMode = 'compose';
	}

	async function handleDeploy() {
		if (!stackName.trim()) {
			toast.error('Please enter a stack name');
			return;
		}

		if (deploymentMode === 'compose' && !composeContent.trim()) {
			toast.error('Please enter compose content');
			return;
		}

		deploying = true;
		try {
			await onDeploy({
				mode: deploymentMode,
				stackName: stackName.trim(),
				composeContent: composeContent.trim(),
				envContent: envContent.trim(),
				selectedStack
			});
			onClose();
			toast.success(`Stack "${stackName}" deployed successfully`);
		} catch (err) {
			console.error('Deploy error:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to deploy stack');
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
