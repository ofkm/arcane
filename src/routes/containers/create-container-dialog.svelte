<script lang="ts">
  import { preventDefault } from "svelte/legacy";
  import type { ContainerConfig } from "$lib/types/docker";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Loader2, Plus, Trash } from "@lucide/svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";

  // Functions for events
  export function onClose() {
    open = false;
  }

  interface Props {
    open?: boolean;
    isCreating?: boolean;
    volumes?: { name: string }[];
    networks?: { name: string }[];
    images?: { id: string; repo: string; tag: string }[];
    onSubmit?: (data: ContainerConfig) => void;
  }

  let {
    open = $bindable(false),
    isCreating = false,
    volumes = [],
    networks = [],
    images = [],
    onSubmit = (data: ContainerConfig) => {},
  }: Props = $props();

  // Internal state
  let containerName = $state("");
  let selectedImage = $state("");
  let selectedTab = $state("basic");

  // Ports mapping (host:container)
  let ports = $state<{ hostPort: string; containerPort: string }[]>([
    { hostPort: "", containerPort: "" },
  ]);

  // Volume mounts
  let volumeMounts = $state<{ source: string; target: string }[]>([
    { source: "", target: "" },
  ]);

  // Environment variables
  let envVars = $state<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);

  // Network and restart policy
  let network = $state("");
  let restartPolicy = $state("no"); // "no", "always", "on-failure", "unless-stopped"

  // Add/remove functions for arrays
  function addPort() {
    ports = [...ports, { hostPort: "", containerPort: "" }];
  }

  function removePort(index: number) {
    ports = ports.filter((_, i) => i !== index);
  }

  function addVolumeMount() {
    volumeMounts = [...volumeMounts, { source: "", target: "" }];
  }

  function removeVolumeMount(index: number) {
    volumeMounts = volumeMounts.filter((_, i) => i !== index);
  }

  function addEnvVar() {
    envVars = [...envVars, { key: "", value: "" }];
  }

  function removeEnvVar(index: number) {
    envVars = envVars.filter((_, i) => i !== index);
  }

  function handleSubmit() {
    if (!selectedImage || !containerName.trim()) return;

    // Filter out empty entries
    const filteredPorts = ports.filter(
      (p) => p.hostPort.trim() && p.containerPort.trim()
    );
    const filteredVolumes = volumeMounts.filter(
      (v) => v.source.trim() && v.target.trim()
    );
    const filteredEnvVars = envVars.filter((e) => e.key.trim());

    const containerConfig: ContainerConfig = {
      name: containerName.trim(),
      image: selectedImage,
      ports: filteredPorts.length > 0 ? filteredPorts : undefined,
      volumes: filteredVolumes.length > 0 ? filteredVolumes : undefined,
      envVars: filteredEnvVars.length > 0 ? filteredEnvVars : undefined,
      network: network || undefined,
      restart: restartPolicy as
        | "no"
        | "always"
        | "on-failure"
        | "unless-stopped",
    };

    onSubmit(containerConfig);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[600px]">
    <Dialog.Header>
      <Dialog.Title>Create Container</Dialog.Title>
      <Dialog.Description>
        Configure and run a new Docker container
      </Dialog.Description>
    </Dialog.Header>

    <Tabs.Root value={selectedTab} class="w-full">
      <Tabs.List class="w-full grid grid-cols-5">
        <Tabs.Trigger value="basic" class="px-1">Basic</Tabs.Trigger>
        <Tabs.Trigger value="ports" class="px-1">Ports</Tabs.Trigger>
        <Tabs.Trigger value="volumes" class="px-1">Volumes</Tabs.Trigger>
        <Tabs.Trigger value="env" class="px-1">Environment</Tabs.Trigger>
        <Tabs.Trigger value="network" class="px-1">Network</Tabs.Trigger>
      </Tabs.List>

      <div class="p-4">
        <form onsubmit={preventDefault(handleSubmit)} class="space-y-6">
          <!-- Basic Settings -->
          <Tabs.Content value="basic">
            <div class="space-y-4">
              <div class="grid grid-cols-1 gap-2">
                <Label for="container-name">Name</Label>
                <Input
                  id="container-name"
                  bind:value={containerName}
                  placeholder="e.g., my-container"
                  disabled={isCreating}
                />
              </div>

              <div class="grid grid-cols-1 gap-2">
                <Label for="container-image">Image</Label>
                <Select.Root
                  type="single"
                  bind:value={selectedImage}
                  disabled={isCreating}
                >
                  <Select.Trigger class="w-full">
                    <span>{selectedImage || "Select an image"}</span>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group>
                      {#each images as image}
                        <Select.Item value={image.repo + ":" + image.tag}>
                          {image.repo + ":" + image.tag}
                        </Select.Item>
                      {/each}
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>

              <div class="grid grid-cols-1 gap-2">
                <Label for="restart-policy">Restart Policy</Label>
                <Select.Root
                  type="single"
                  bind:value={restartPolicy}
                  disabled={isCreating}
                >
                  <Select.Trigger class="w-full">
                    <span>{restartPolicy}</span>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="no">no</Select.Item>
                    <Select.Item value="always">always</Select.Item>
                    <Select.Item value="on-failure">on-failure</Select.Item>
                    <Select.Item value="unless-stopped">
                      unless-stopped
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          </Tabs.Content>

          <!-- Port Mappings -->
          <Tabs.Content value="ports">
            <div class="space-y-4">
              {#each ports as port, index}
                <div class="flex space-x-3 items-end">
                  <div class="flex-1 grid grid-cols-5 gap-2 items-center">
                    <div class="col-span-2">
                      <Label for={`host-port-${index}`} class="mb-2 block">
                        Host Port
                      </Label>
                      <Input
                        id={`host-port-${index}`}
                        bind:value={port.hostPort}
                        placeholder="8080"
                        disabled={isCreating}
                      />
                    </div>
                    <div class="flex items-center justify-center">
                      <span class="text-center text-xl">:</span>
                    </div>
                    <div class="col-span-2">
                      <Label for={`container-port-${index}`} class="mb-2 block">
                        Container Port
                      </Label>
                      <Input
                        id={`container-port-${index}`}
                        bind:value={port.containerPort}
                        placeholder="80"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    type="button"
                    onclick={() => removePort(index)}
                    disabled={ports.length <= 1 || isCreating}
                    class="flex-shrink-0"
                  >
                    <Trash class="h-4 w-4" />
                  </Button>
                </div>
              {/each}
              <Button
                variant="outline"
                type="button"
                onclick={addPort}
                class="w-full"
                disabled={isCreating}
              >
                <Plus class="h-4 w-4 mr-2" /> Add Port Mapping
              </Button>
            </div>
          </Tabs.Content>

          <!-- Volume Mounts -->
          <Tabs.Content value="volumes">
            <div class="space-y-4">
              {#each volumeMounts as mount, index}
                <div class="flex space-x-3 items-end">
                  <div class="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <Label for={`volume-source-${index}`} class="mb-2 block">
                        Source Volume
                      </Label>
                      <Select.Root
                        type="single"
                        bind:value={mount.source}
                        disabled={isCreating}
                      >
                        <Select.Trigger class="w-full">
                          <span>{mount.source || "Select volume"}</span>
                        </Select.Trigger>
                        <Select.Content>
                          {#each volumes as volume}
                            <Select.Item value={volume.name}>
                              {volume.name}
                            </Select.Item>
                          {/each}
                        </Select.Content>
                      </Select.Root>
                    </div>
                    <div>
                      <Label for={`volume-target-${index}`} class="mb-2 block">
                        Container Path
                      </Label>
                      <Input
                        id={`volume-target-${index}`}
                        bind:value={mount.target}
                        placeholder="/data"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    type="button"
                    onclick={() => removeVolumeMount(index)}
                    disabled={volumeMounts.length <= 1 || isCreating}
                    class="flex-shrink-0"
                  >
                    <Trash class="h-4 w-4" />
                  </Button>
                </div>
              {/each}
              <Button
                variant="outline"
                type="button"
                onclick={addVolumeMount}
                class="w-full"
                disabled={isCreating}
              >
                <Plus class="h-4 w-4 mr-2" /> Add Volume Mount
              </Button>
            </div>
          </Tabs.Content>

          <!-- Environment Variables -->
          <Tabs.Content value="env">
            <div class="space-y-4">
              {#each envVars as env, index}
                <div class="flex space-x-3 items-end">
                  <div class="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <Label for={`env-key-${index}`} class="mb-2 block">
                        Key
                      </Label>
                      <Input
                        id={`env-key-${index}`}
                        bind:value={env.key}
                        placeholder="MYSQL_ROOT_PASSWORD"
                        disabled={isCreating}
                      />
                    </div>
                    <div>
                      <Label for={`env-value-${index}`} class="mb-2 block">
                        Value
                      </Label>
                      <Input
                        id={`env-value-${index}`}
                        bind:value={env.value}
                        placeholder="secret"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    type="button"
                    onclick={() => removeEnvVar(index)}
                    disabled={envVars.length <= 1 || isCreating}
                    class="flex-shrink-0"
                  >
                    <Trash class="h-4 w-4" />
                  </Button>
                </div>
              {/each}
              <Button
                variant="outline"
                type="button"
                onclick={addEnvVar}
                class="w-full"
                disabled={isCreating}
              >
                <Plus class="h-4 w-4 mr-2" /> Add Environment Variable
              </Button>
            </div>
          </Tabs.Content>

          <!-- Network Settings -->
          <Tabs.Content value="network">
            <div class="space-y-4">
              <div class="grid grid-cols-1 gap-2">
                <Label for="container-network">Network</Label>
                <Select.Root
                  type="single"
                  bind:value={network}
                  disabled={isCreating}
                >
                  <Select.Trigger class="w-full">
                    <span>{network || "Default Bridge"}</span>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">Default Bridge</Select.Item>
                    {#each networks as net}
                      <Select.Item value={net.name}>
                        {net.name}
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          </Tabs.Content>
        </form>
      </div>
    </Tabs.Root>

    <Dialog.Footer class="pt-4">
      <Button
        variant="outline"
        onclick={onClose}
        disabled={isCreating}
        class="mr-2"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        onclick={handleSubmit}
        disabled={isCreating || !containerName.trim() || !selectedImage}
      >
        {#if isCreating}
          <Loader2 class="h-4 w-4 mr-2 animate-spin" /> Creating...
        {:else}
          Create Container
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
