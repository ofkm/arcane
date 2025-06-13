<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Shield, Plus, Users, Settings, Save, RefreshCw } from '@lucide/svelte';
	import type { PageData } from './$types';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import settingsStore from '$lib/stores/config-store';

	let { data }: { data: PageData } = $props();

	let isLoading = $state({
		saving: false
	});

	const roles = [
		{
			id: 1,
			name: 'Admin',
			description: 'Full system access',
			permissions: ['containers:manage', 'stacks:manage', 'volumes:manage', 'networks:manage', 'settings:manage', 'users:manage']
		},
		{
			id: 2,
			name: 'User',
			description: 'Container and stack operations',
			permissions: ['containers:view', 'containers:manage', 'stacks:view', 'stacks:manage', 'volumes:view', 'networks:view']
		},
		{
			id: 3,
			name: 'Viewer',
			description: 'Read-only access',
			permissions: ['containers:view', 'stacks:view', 'volumes:view', 'networks:view']
		}
	];

	// Available permissions categories
	const permissionCategories = [
		{
			name: 'Containers',
			permissions: ['containers:view', 'containers:manage', 'containers:deploy']
		},
		{
			name: 'Stacks',
			permissions: ['stacks:view', 'stacks:manage', 'stacks:deploy']
		},
		{
			name: 'Volumes',
			permissions: ['volumes:view', 'volumes:manage', 'volumes:create']
		},
		{
			name: 'Networks',
			permissions: ['networks:view', 'networks:manage', 'networks:create']
		},
		{
			name: 'Settings',
			permissions: ['settings:view', 'settings:manage']
		},
		{
			name: 'Users',
			permissions: ['users:view', 'users:manage', 'users:create']
		}
	];

	let selectedRole = $state(roles[0]);
</script>

<svelte:head>
	<title>RBAC Settings - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Role-Based Access Control</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage user roles and permissions</p>
		</div>

		<Button disabled={isLoading.saving} class="arcane-button-save h-10">
			{#if isLoading.saving}
				<RefreshCw class="size-4 animate-spin" />
				Saving...
			{:else}
				<Save class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<div class="mb-6">
		<div class="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
			<div class="space-y-0.5">
				<label for="rbacEnabledSwitch" class="text-base font-medium">Enable Role-Based Access Control</label>
				<p class="text-muted-foreground text-sm">Control user permissions with customizable roles</p>
			</div>
			<Switch id="rbacEnabledSwitch" name="rbacEnabled" checked={$settingsStore.auth?.rbacEnabled} onCheckedChange={() => {}} />
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="lg:col-span-1">
			<Card.Root class="h-full border shadow-sm">
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="rounded-full bg-blue-500/10 p-2">
								<Users class="size-5 text-blue-500" />
							</div>
							<Card.Title>Roles</Card.Title>
						</div>
						<Button variant="outline" size="sm">
							<Plus class="mr-1 size-4" /> Add
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						{#each roles as role (role.id)}
							<button class="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors {selectedRole.id === role.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50'}" onclick={() => (selectedRole = role)}>
								<div>
									<div class="font-medium">{role.name}</div>
									<div class="text-xs {selectedRole.id === role.id ? 'text-primary-foreground/90' : 'text-muted-foreground'}">
										{role.description}
									</div>
								</div>
								<Shield class="size-4 opacity-70" />
							</button>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="lg:col-span-2">
			<Card.Root class="border shadow-sm">
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="rounded-full bg-purple-500/10 p-2">
								<Settings class="size-5 text-purple-500" />
							</div>
							<div>
								<Card.Title>Role: {selectedRole.name}</Card.Title>
								<Card.Description>{selectedRole.description}</Card.Description>
							</div>
						</div>
						<div class="space-x-2">
							<Button variant="outline" size="sm">Delete</Button>
							<Button size="sm">Save Changes</Button>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="space-y-6">
						<!-- Role Info -->
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<label for="roleName" class="text-sm font-medium">Role Name</label>
								<Input id="roleName" name="roleName" value={selectedRole.name} placeholder="Enter role name" />
							</div>
							<div class="space-y-2">
								<label for="roleDescription" class="text-sm font-medium">Description</label>
								<Input id="roleDescription" name="roleDescription" value={selectedRole.description} placeholder="Brief description" />
							</div>
						</div>

						<!-- Permissions -->
						<div>
							<h3 class="mb-3 text-sm font-medium">Permissions</h3>
							<div class="divide-y rounded-md border">
								{#each permissionCategories as category (category.name)}
									<div class="p-3">
										<h4 class="mb-2 font-medium">{category.name}</h4>
										<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{#each category.permissions as permission (permission)}
												<label class="flex items-center space-x-2 text-sm">
													<input type="checkbox" class="text-primary focus:ring-primary rounded border-gray-300" checked={selectedRole.permissions.includes(permission)} />
													<span>{permission.split(':')[1]}</span>
												</label>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Hidden CSRF token if needed -->
	<input type="hidden" id="csrf_token" value={data.csrf} />
</div>
