<script lang="ts">
	import '../../app.css';
	import { CheckCircle2, Key, Settings, Database, Shield, CheckCircle } from '@lucide/svelte';
	import { page } from '$app/state';

	let { children } = $props();

	const steps = [
		{ id: 'welcome', label: 'Welcome', path: '/onboarding/welcome', icon: CheckCircle2 },
		{ id: 'password', label: 'Admin Password', path: '/onboarding/password', icon: Key },
		{ id: 'docker', label: 'Docker Setup', path: '/onboarding/docker', icon: Database },
		{ id: 'security', label: 'Security', path: '/onboarding/security', icon: Shield },
		{ id: 'settings', label: 'Application Settings', path: '/onboarding/settings', icon: Settings },
		{ id: 'complete', label: 'Complete', path: '/onboarding/complete', icon: CheckCircle }
	];

	const currentStepIndex = $derived(steps.findIndex((step) => page.url.pathname === step.path));
</script>

<div class="flex min-h-screen flex-col">
	<header class="border-b px-8 py-8">
		<div class="flex items-center">
			<img src="/img/arcane.png" alt="Arcane" class="size-12" />
			<h1 class="ml-4 text-2xl font-bold">Arcane Setup</h1>
		</div>
	</header>

	<div class="container mx-auto px-4 py-6">
		<div class="mb-8 flex items-center justify-between">
			{#each steps as step, i (step.id)}
				<div class="flex flex-col items-center">
					<div
						class={`flex size-10 items-center justify-center rounded-full ${i <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
					>
						<step.icon class="size-5" />
					</div>
					<span
						class={`mt-2 text-sm ${i <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}`}
						>{step.label}</span
					>
				</div>

				{#if i < steps.length - 1}
					<div class={`h-1 flex-1 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`}></div>
				{/if}
			{/each}
		</div>
	</div>

	<main class="container mx-auto flex-1 px-4 py-6">
		<div class="rounded-lg border bg-card p-8 shadow-sm">
			{@render children()}
		</div>
	</main>
</div>
