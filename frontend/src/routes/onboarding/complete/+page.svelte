<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CircleCheckIcon from '@lucide/svelte/icons/check-circle';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { settingsService } from '$lib/services/settings-service.js';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let isLoading = $state(false);

	async function completeOnboarding() {
		isLoading = true;

		try {
			await settingsService.updateSettings({
				...currentSettings,
				onboardingCompleted: true,
				onboardingSteps: {
					welcome: true,
					password: true,
					docker: true,
					security: true,
					settings: true
				}
			});

			toast.success('Onboarding completed successfully!');
			await invalidateAll();
			goto('/', { replaceState: true });
		} catch (error) {
			toast.error('Failed to complete onboarding');
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-6 text-center">
	<div class="mx-auto flex size-20 items-center justify-center rounded-full bg-green-100">
		<CircleCheckIcon class="size-10 text-green-600" />
	</div>

	<div>
		<h2 class="text-2xl font-bold">Setup Complete!</h2>
		<p class="text-muted-foreground mt-2">
			Congratulations! You've successfully configured Arcane. You're ready to start managing your containers.
		</p>
	</div>

	<div class="space-y-4">
		<div class="bg-muted/50 rounded-lg border p-4">
			<h3 class="font-semibold">What's Next?</h3>
			<ul class="text-muted-foreground mt-2 space-y-1 text-sm">
				<li>• Start managing your Docker containers and images</li>
				<li>• Create and deploy Docker Compose Projects</li>
				<li>• Monitor system resources and performance</li>
				<li>• Configure additional settings as needed</li>
			</ul>
		</div>

		<Button onclick={completeOnboarding} disabled={isLoading} size="lg" class="w-full">
			{#if isLoading}
				<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
				Completing Setup...
			{:else}
				Go to Dashboard
				<ArrowRightIcon class="ml-2 size-4" />
			{/if}
		</Button>
	</div>
</div>
