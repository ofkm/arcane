<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { settingsAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { Loader2, CheckCircle, ArrowRight } from '@lucide/svelte';

	let isLoading = $state(false);

	async function completeOnboarding() {
		isLoading = true;

		try {
			await settingsAPI.updateSettings({
				onboarding: {
					completed: true,
					completedAt: Date.now(),
					steps: {
						welcome: true,
						password: true,
						docker: true,
						security: true,
						settings: true
					}
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
		<CheckCircle class="size-10 text-green-600" />
	</div>

	<div>
		<h2 class="text-2xl font-bold">Setup Complete!</h2>
		<p class="text-muted-foreground mt-2">
			Congratulations! You've successfully configured Arcane. You're ready to start managing your
			containers.
		</p>
	</div>

	<div class="space-y-4">
		<div class="rounded-lg border bg-muted/50 p-4">
			<h3 class="font-semibold">What's Next?</h3>
			<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
				<li>• Start managing your Docker containers and images</li>
				<li>• Create and deploy Docker Compose stacks</li>
				<li>• Monitor system resources and performance</li>
				<li>• Configure additional settings as needed</li>
			</ul>
		</div>

		<Button onclick={completeOnboarding} disabled={isLoading} size="lg" class="w-full">
			{#if isLoading}
				<Loader2 class="mr-2 size-4 animate-spin" />
				Completing Setup...
			{:else}
				Go to Dashboard
				<ArrowRight class="ml-2 size-4" />
			{/if}
		</Button>
	</div>
</div>
