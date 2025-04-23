<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Shield, Plus, Users, Settings } from "@lucide/svelte";
  import type { ActionData, PageData } from "../$types";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  // Sample roles for demonstration
  const roles = [
    {
      id: 1,
      name: "Admin",
      description: "Full system access",
      permissions: [
        "containers:manage",
        "stacks:manage",
        "volumes:manage",
        "networks:manage",
        "settings:manage",
        "users:manage",
      ],
    },
    {
      id: 2,
      name: "User",
      description: "Container and stack operations",
      permissions: [
        "containers:view",
        "containers:manage",
        "stacks:view",
        "stacks:manage",
        "volumes:view",
        "networks:view",
      ],
    },
    {
      id: 3,
      name: "Viewer",
      description: "Read-only access",
      permissions: [
        "containers:view",
        "stacks:view",
        "volumes:view",
        "networks:view",
      ],
    },
  ];

  // Available permissions categories
  const permissionCategories = [
    {
      name: "Containers",
      permissions: [
        "containers:view",
        "containers:manage",
        "containers:deploy",
      ],
    },
    {
      name: "Stacks",
      permissions: ["stacks:view", "stacks:manage", "stacks:deploy"],
    },
    {
      name: "Volumes",
      permissions: ["volumes:view", "volumes:manage", "volumes:create"],
    },
    {
      name: "Networks",
      permissions: ["networks:view", "networks:manage", "networks:create"],
    },
    {
      name: "Settings",
      permissions: ["settings:view", "settings:manage"],
    },
    {
      name: "Users",
      permissions: ["users:view", "users:manage", "users:create"],
    },
  ];

  let selectedRole = $state(roles[0]);
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <!-- Roles List -->
  <div class="lg:col-span-1">
    <Card.Root class="border shadow-sm h-full">
      <Card.Header class="pb-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="bg-blue-500/10 p-2 rounded-full">
              <Users class="h-5 w-5 text-blue-500" />
            </div>
            <Card.Title>Roles</Card.Title>
          </div>
          <Button variant="outline" size="sm">
            <Plus class="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each roles as role}
            <button
              class="w-full text-left p-3 rounded-md border transition-colors flex items-center justify-between
                     {selectedRole.id === role.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted/50'}"
              onclick={() => (selectedRole = role)}
            >
              <div>
                <div class="font-medium">{role.name}</div>
                <div
                  class="text-xs {selectedRole.id === role.id
                    ? 'text-primary-foreground/90'
                    : 'text-muted-foreground'}"
                >
                  {role.description}
                </div>
              </div>
              <Shield class="h-4 w-4 opacity-70" />
            </button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Role Details -->
  <div class="lg:col-span-2">
    <Card.Root class="border shadow-sm">
      <Card.Header class="pb-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="bg-purple-500/10 p-2 rounded-full">
              <Settings class="h-5 w-5 text-purple-500" />
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
              <label for="roleName" class="text-sm font-medium">Role Name</label
              >
              <Input
                id="roleName"
                name="roleName"
                value={selectedRole.name}
                placeholder="Enter role name"
              />
            </div>
            <div class="space-y-2">
              <label for="roleDescription" class="text-sm font-medium"
                >Description</label
              >
              <Input
                id="roleDescription"
                name="roleDescription"
                value={selectedRole.description}
                placeholder="Brief description"
              />
            </div>
          </div>

          <!-- Permissions -->
          <div>
            <h3 class="text-sm font-medium mb-3">Permissions</h3>
            <div class="border rounded-md divide-y">
              {#each permissionCategories as category}
                <div class="p-3">
                  <h4 class="font-medium mb-2">{category.name}</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {#each category.permissions as permission}
                      <label class="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          class="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedRole.permissions.includes(
                            permission
                          )}
                        />
                        <span>{permission.split(":")[1]}</span>
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
