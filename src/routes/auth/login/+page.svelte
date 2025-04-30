<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { AlertCircle } from '@lucide/svelte';
	import type { PageData } from './$types';

	// Define a proper type for form data
	type ActionData = {
		error?: string;
		username?: string;
	};

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	const { providers, providerUrls } = data;

	let loading = $state(false);
</script>

<div class="flex max-h-screen flex-col justify-center my-auto py-12 sm:px-6 lg:px-8">
	<div class="mx-auto w-full max-w-md">
		<img class="h-40 w-auto mx-auto" src="/img/arcane.png" alt="Arcane" />
		<h2 class="mt-2 text-center text-2xl font-bold leading-9 tracking-tight">Sign in to Arcane</h2>
	</div>

	<div class="mt-10 mx-auto w-full max-w-[480px]">
		<div class="bg-card px-6 py-5 shadow sm:rounded-lg sm:px-12">
			{#if form?.error}
				<Alert.Root class="mb-4" variant="destructive">
					<AlertCircle class="h-4 w-4 mr-2" />
					<Alert.Title>Authentication Failed</Alert.Title>
					<Alert.Description>{form.error}</Alert.Description>
				</Alert.Root>
			{/if}

			<form
				class="space-y-6"
				method="POST"
				action="?/login"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						await update();
					};
				}}
			>
				<div>
					<Label for="username" class="block text-sm font-medium leading-6">Username</Label>
					<div class="mt-2">
						<Input id="username" name="username" type="text" autocomplete="username" required value={form?.username ?? ''} />
					</div>
				</div>

				<div>
					<Label for="password" class="block text-sm font-medium leading-6">Password</Label>
					<div class="mt-2">
						<Input id="password" name="password" type="password" autocomplete="current-password" required />
					</div>
				</div>

				<div>
					<Button type="submit" class="w-full" disabled={loading} aria-busy={loading}>
						{#if loading}
							<span class="loading loading-spinner loading-xs mr-2"></span>
						{/if}
						Sign in
					</Button>
				</div>
			</form>

			{#if providers && providers.length > 0}
				<div class="mt-10">
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t"></div>
						</div>
						<div class="relative flex justify-center text-sm font-medium leading-6">
							<span class="bg-card px-6 text-muted-foreground">Or continue with</span>
						</div>
					</div>

					<div class="mt-6 grid grid-cols-1 gap-4">
						{#each providers as provider}
							<a href={providerUrls[provider.id]} class="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0">
								{provider.name}
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
