<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import {
    UserPlus,
    User,
    Search,
    MoreHorizontal,
    Trash,
  } from "@lucide/svelte";
  import type { ActionData, PageData } from "../$types";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  // Sample users for demonstration
  const users = [
    { id: 1, name: "Admin User", email: "admin@example.com", role: "Admin" },
    { id: 2, name: "Regular User", email: "user@example.com", role: "User" },
    { id: 3, name: "Viewer", email: "viewer@example.com", role: "Viewer" },
  ];

  let searchQuery = $state("");
</script>

<div class="space-y-6">
  <Card.Root class="border shadow-sm">
    <Card.Header class="pb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="bg-green-500/10 p-2 rounded-full">
            <User class="h-5 w-5 text-green-500" />
          </div>
          <div>
            <Card.Title>User Management</Card.Title>
            <Card.Description>Manage system users</Card.Description>
          </div>
        </div>
        <Button variant="default" size="sm">
          <UserPlus class="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="space-y-4">
        <!-- Search -->
        <div class="relative">
          <Search
            class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search users..."
            class="pl-8"
            bind:value={searchQuery}
          />
        </div>

        <!-- Users Table -->
        <div class="border rounded-md">
          <table class="w-full">
            <thead>
              <tr class="border-b bg-muted/50">
                <th class="text-left p-2 pl-4 font-medium">Name</th>
                <th class="text-left p-2 font-medium">Email</th>
                <th class="text-left p-2 font-medium">Role</th>
                <th class="text-right p-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each users.filter((u) => u.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) || u.email
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())) as user}
                <tr class="border-b last:border-0">
                  <td class="p-2 pl-4">{user.name}</td>
                  <td class="p-2">{user.email}</td>
                  <td class="p-2">{user.role}</td>
                  <td class="p-2 pr-4 text-right">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <Button variant="ghost" size="icon" class="h-8 w-8">
                          <MoreHorizontal class="h-4 w-4" />
                          <span class="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        <DropdownMenu.Item>Edit User</DropdownMenu.Item>
                        <DropdownMenu.Item>Change Password</DropdownMenu.Item>
                        <DropdownMenu.Item>Modify Roles</DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item class="text-destructive">
                          <Trash class="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</div>
