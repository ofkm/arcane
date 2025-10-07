<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Server from '@lucide/svelte/icons/server';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages';

	let { showAddEnvironment = true } = $props();

	function handleAddEnvironment() {
		window.location.href = '/environments';
	}

	function openDockerDocs() {
		window.open('https://docs.docker.com/get-docker/', '_blank');
	}
</script>

<div class="container mx-auto flex min-h-[60vh] items-center justify-center p-6">
	<Card class="max-w-2xl p-8">
		<div class="flex flex-col items-center text-center">
			<div class="bg-destructive/10 text-destructive mb-6 rounded-full p-4">
				<AlertCircle class="h-16 w-16" />
			</div>

			<h2 class="mb-4 text-3xl font-bold">Docker Not Available</h2>

			<p class="text-muted-foreground mb-6 text-lg">The local Docker socket is not accessible. This typically happens when:</p>

			<ul class="text-muted-foreground mb-8 space-y-2 text-left">
				<li class="flex items-start gap-2">
					<span class="mt-1">•</span>
					<span>Docker is not installed on this system</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="mt-1">•</span>
					<span>Docker is not running</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="mt-1">•</span>
					<span>The Docker socket is not mounted to the Arcane container</span>
				</li>
			</ul>

			<div class="mb-6 w-full space-y-4">
				<div class="bg-muted rounded-lg p-4 text-left">
					<h3 class="mb-2 font-semibold">Using Arcane Without Local Docker</h3>
					<p class="text-muted-foreground text-sm">
						You can still use Arcane to manage remote Docker environments. Add remote hosts using Arcane agents to manage
						containers on other machines.
					</p>
				</div>

				<div class="bg-muted rounded-lg p-4 text-left">
					<h3 class="mb-2 font-semibold">To Enable Local Docker</h3>
					<p class="text-muted-foreground text-sm">
						Ensure Docker is installed and running, then mount the Docker socket when starting Arcane:
						<code class="bg-background mt-2 block rounded border p-2 text-xs">-v /var/run/docker.sock:/var/run/docker.sock</code>
					</p>
				</div>
			</div>

			<div class="flex flex-wrap gap-3">
				{#if showAddEnvironment}
					<Button onclick={handleAddEnvironment} class="gap-2">
						<Server class="h-4 w-4" />
						Add Remote Environment
					</Button>
				{/if}
				<Button variant="outline" onclick={openDockerDocs} class="gap-2">
					<ExternalLink class="h-4 w-4" />
					Docker Installation Guide
				</Button>
			</div>
		</div>
	</Card>
</div>
