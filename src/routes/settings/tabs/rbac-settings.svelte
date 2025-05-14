<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Shield, Plus, Users, Settings } from '@lucide/svelte';
	import type { PageData } from '../$types';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import { settingsStore } from '$lib/stores/settings-store';

	let { data } = $props<{ data: PageData }>();

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

<div class="mb-6">
	<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
		<div class="space-y-0.5">
			<label for="rbacEnabledSwitch" class="text-base font-medium">Enable Role-Based Access Control</label>
			<p class="text-sm text-muted-foreground">Control user permissions with customizable roles</p>
		</div>
		<Switch
			id="rbacEnabledSwitch"
			name="rbacEnabled"
			checked={$settingsStore.auth?.rbacEnabled}
			onCheckedChange={(checked) => {
				settingsStore.update((current) => ({
					...current,
					auth: {
						...current.auth,
						rbacEnabled: checked
					}
				}));
			}}
		/>
	</div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	<div class="lg:col-span-1">
		<Card.Root class="border shadow-sm h-full">
			<Card.Header class="pb-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="bg-blue-500/10 p-2 rounded-full">
							<Users class="text-blue-500 size-5" />
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
						<button class="w-full text-left p-3 rounded-md border transition-colors flex items-center justify-between {selectedRole.id === role.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50'}" onclick={() => (selectedRole = role)}>
							<div>
								<div class="font-medium">{role.name}</div>
								<div class="text-xs {selectedRole.id === role.id ? 'text-primary-foreground/90' : 'text-muted-foreground'}">
									{role.description}
								</div>
							</div>
							<Shield class="opacity-70 size-4" />
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
						<div class="bg-purple-500/10 p-2 rounded-full">
							<Settings class="text-purple-500 size-5" />
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
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
						<h3 class="text-sm font-medium mb-3">Permissions</h3>
						<div class="border rounded-md divide-y">
							{#each permissionCategories as category (category.name)}
								<div class="p-3">
									<h4 class="font-medium mb-2">{category.name}</h4>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{#each category.permissions as permission (permission)}
											<label class="flex items-center space-x-2 text-sm">
												<input type="checkbox" class="rounded border-gray-300 text-primary focus:ring-primary" checked={selectedRole.permissions.includes(permission)} />
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
