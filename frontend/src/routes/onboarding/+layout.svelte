<script lang="ts">
	import '../../app.css';
	import { CheckCircle2, Key, Settings, Database, Shield, CheckCircle } from '@lucide/svelte';
	import { page } from '$app/state';
	import { fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

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
	const progressPercentage = $derived(((currentStepIndex + 1) / steps.length) * 100);
</script>

<div
	class="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20"
>
	<!-- Header with subtle animation -->
	<header class="border-b bg-background/80 backdrop-blur-sm px-8 py-6">
		<div class="flex items-center" in:fade={{ duration: 600, easing: cubicOut }}>
			<div class="relative">
				<img src="/img/arcane.png" alt="Arcane" class="size-12 drop-shadow-sm" />
				<div
					class="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur opacity-75"
				></div>
			</div>
			<div class="ml-4">
				<h1
					class="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
				>
					Arcane Setup
				</h1>
				<p class="text-sm text-muted-foreground">Get started in just a few steps</p>
			</div>
		</div>
	</header>

	<!-- Progress bar -->
	<div class="border-b bg-background/50 backdrop-blur-sm">
		<div class="container mx-auto px-4">
			<div class="relative h-1 bg-muted/30 overflow-hidden">
				<div
					class="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
					style="width: {progressPercentage}%"
				></div>
			</div>
		</div>
	</div>

	<!-- Step indicators -->
	<div class="container mx-auto px-4 py-8">
		<div class="flex items-center justify-between max-w-4xl mx-auto">
			{#each steps as step, i (step.id)}
				<div class="flex flex-col items-center relative group">
					<!-- Step circle -->
					<div
						class={`flex size-12 items-center justify-center rounded-full transition-all duration-300 ${
							i < currentStepIndex
								? 'bg-primary text-primary-foreground shadow-lg scale-105'
								: i === currentStepIndex
									? 'bg-primary text-primary-foreground shadow-xl scale-110 ring-4 ring-primary/20'
									: 'bg-muted text-muted-foreground hover:bg-muted/80'
						}`}
						in:fade={{ duration: 400, delay: i * 100 }}
					>
						<step.icon class="size-5" />
					</div>

					<!-- Step label -->
					<span
						class={`mt-3 text-sm font-medium transition-all duration-300 text-center max-w-24 ${
							i <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
						}`}
						in:fade={{ duration: 400, delay: i * 100 + 200 }}
					>
						{step.label}
					</span>

					<!-- Connector line -->
					{#if i < steps.length - 1}
						<div
							class={`absolute top-6 left-full w-full h-0.5 transition-all duration-500 ${
								i < currentStepIndex ? 'bg-primary' : 'bg-muted'
							}`}
							style="width: calc(100vw / {steps.length} - 3rem);"
						></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Main content with enhanced styling -->
	<main class="container mx-auto flex-1 px-4 pb-8">
		<div class="max-w-4xl mx-auto">
			<div
				class="rounded-2xl border bg-card/50 backdrop-blur-sm p-8 shadow-xl ring-1 ring-inset ring-white/10"
				in:fade={{ duration: 500, delay: 300 }}
			>
				<div class="min-h-[500px] flex flex-col" in:slide={{ duration: 400, easing: cubicOut }}>
					{@render children()}
				</div>
			</div>
		</div>
	</main>
</div>

<style>
	:global(.step-content) {
		animation: slideInUp 0.5s ease-out;
	}

	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
