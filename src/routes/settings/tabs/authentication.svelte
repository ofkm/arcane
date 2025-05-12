<script lang="ts">
	import type { PageData } from '../$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Lock, Key } from '@lucide/svelte';
	import { settingsStore } from '$lib/stores/settings-store';

	let { data } = $props<{ data: PageData }>();
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-indigo-500/10 p-2 rounded-full">
					<Lock class="h-5 w-5 text-indigo-500" />
				</div>
				<div>
					<Card.Title>Authentication Methods</Card.Title>
					<Card.Description>Configure how users sign in</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
					<div class="space-y-0.5">
						<label for="localAuthSwitch" class="text-base font-medium">Local Authentication</label>
						<p class="text-sm text-muted-foreground">Username and password stored in the system</p>
						<p class="text-xs text-muted-foreground mt-1">Enable this as a fallback option if OIDC authentication is unavailable.</p>
					</div>
					<Switch
						id="localAuthSwitch"
						checked={$settingsStore.auth?.localAuthEnabled ?? true}
						onCheckedChange={(checked) => {
							settingsStore.update((current) => ({
								...current,
								auth: {
									...(current.auth || {}),
									localAuthEnabled: checked
								}
							}));
						}}
					/>
				</div>
				<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
					<div class="space-y-0.5">
						<label for="localAuthSwitch" class="text-base font-medium">OIDC Authentication</label>
						<p class="text-sm text-muted-foreground">Use a External OIDC Provider for Authntication</p>
					</div>
					<Switch
						id="oidcAuthSwitch"
						checked={$settingsStore.auth?.oidcEnabled ?? false}
						onCheckedChange={(checked) => {
							settingsStore.update((current) => ({
								...current,
								auth: {
									...(current.auth || {}),
									oidcEnabled: checked
								}
							}));
						}}
					/>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="space-y-6">
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-cyan-500/10 p-2 rounded-full">
						<Key class="h-5 w-5 text-cyan-500" />
					</div>
					<div>
						<Card.Title>Session Settings</Card.Title>
						<Card.Description>Configure session behavior</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="space-y-2">
						<label for="sessionTimeout" class="text-sm font-medium">Session Timeout (minutes)</label>
						<Input
							type="number"
							id="sessionTimeout"
							name="sessionTimeout"
							value={$settingsStore.auth?.sessionTimeout ?? 60}
							min="15"
							max="1440"
							oninput={(event) => {
								const target = event.target as HTMLInputElement;
								settingsStore.update((current) => ({
									...current,
									auth: {
										...(current.auth ?? {}),
										sessionTimeout: parseInt(target.value)
									}
								}));
							}}
						/>
						<p class="text-xs text-muted-foreground">Time until inactive sessions are automatically logged out (15-1440 minutes)</p>
					</div>

					<div class="space-y-2">
						<label for="passwordPolicy" class="text-sm font-medium">Password Policy</label>
						<div class="grid grid-cols-3 gap-2">
							<Button
								variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'basic' ? 'default' : 'outline'}
								class="w-full"
								onclick={() => {
									settingsStore.update((current) => ({
										...current,
										auth: {
											...current.auth,
											passwordPolicy: 'basic'
										}
									}));
								}}>Basic</Button
							>
							<Button
								variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'standard' ? 'default' : 'outline'}
								class="w-full"
								onclick={() => {
									settingsStore.update((current) => ({
										...current,
										auth: {
											...current.auth,
											passwordPolicy: 'standard'
										}
									}));
								}}>Standard</Button
							>
							<Button
								variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'strong' ? 'default' : 'outline'}
								class="w-full"
								onclick={() => {
									settingsStore.update((current) => ({
										...current,
										auth: {
											...current.auth,
											passwordPolicy: 'strong'
										}
									}));
								}}>Strong</Button
							>
						</div>
						<input type="hidden" id="passwordPolicy" name="passwordPolicy" value={$settingsStore.auth?.passwordPolicy || 'strong'} />
						<p class="text-xs text-muted-foreground mt-1">
							{#if $settingsStore.auth?.passwordPolicy === 'basic'}
								Basic: Minimum 8 characters
							{:else if $settingsStore.auth?.passwordPolicy === 'standard'}
								Standard: Minimum 10 characters, requires mixed case and numbers
							{:else}
								Strong: Minimum 12 characters, requires mixed case, numbers and special characters
							{/if}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
