<script lang="ts">
	import '../../app.css';
	import { page } from '$app/state';
	import { CheckCircle2, Settings, Key } from '@lucide/svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const steps = [
		{ id: 'welcome', label: 'Welcome', path: '/onboarding/welcome', icon: CheckCircle2 },
		{ id: 'password', label: 'Admin Password', path: '/onboarding/password', icon: Key },
		{ id: 'settings', label: 'Initial Setup', path: '/onboarding/settings', icon: Settings },
		{ id: 'complete', label: 'Complete', path: '/onboarding/complete', icon: CheckCircle2 }
	];

	let currentStep = $derived(steps.findIndex((step) => page.url.pathname === step.path));
</script>

<div class="min-h-screen flex flex-col">
	<header class="pb-6 px-8 border-b">
		<div class="flex items-center">
			<img src="/img/arcane.png" alt="Arcane" class="h-12" />
			<h1 class="ml-4 text-2xl font-bold">Arcane Setup</h1>
		</div>
	</header>

	<div class="container mx-auto px-4 py-6">
		<div class="flex items-center justify-between mb-8">
			{#each steps as step, i (step.id)}
				<div class="flex flex-col items-center">
					<div class={`rounded-full w-10 h-10 flex items-center justify-center ${i <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
						<step.icon class="h-5 w-5" />
					</div>
					<span class={`text-sm mt-2 ${i <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
				</div>

				{#if i < steps.length - 1}
					<div class={`h-1 flex-1 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`}></div>
				{/if}
			{/each}
		</div>
	</div>

	<main class="flex-1 container mx-auto px-4 py-6">
		{@render children?.()}
	</main>
</div>
