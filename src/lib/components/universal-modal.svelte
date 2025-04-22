<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    AlertCircle,
    CheckCircle2,
    Info,
    AlertTriangle,
    X,
  } from "@lucide/svelte";

  type MessageType = "success" | "error" | "warning" | "info";

  let {
    open = $bindable(false),
    type = "info",
    title = "",
    message = "",
    okText = "OK",
    cancelText = "Cancel",
    onConfirm = undefined,
    showCancel = false,
  }: {
    open?: boolean;
    type?: MessageType;
    title?: string;
    message?: string;
    okText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  } = $props();

  // Determine icon and color based on type
  const iconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colorMap = {
    success: "text-green-500",
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-blue-500",
  };

  const Icon = iconMap[type];
  const iconColor = colorMap[type];

  function handleConfirm() {
    if (onConfirm) onConfirm();
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[425px]">
    <div class="flex items-start gap-4">
      <div class={`${iconColor} shrink-0`}>
        <Icon class="h-6 w-6" />
      </div>

      <div class="flex-1">
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
          {#if message}
            <Dialog.Description>
              {message}
            </Dialog.Description>
          {/if}
        </Dialog.Header>
      </div>
    </div>

    <Dialog.Footer>
      {#if showCancel}
        <Button type="button" variant="outline" onclick={() => (open = false)}>
          {cancelText}
        </Button>
      {/if}
      <Button
        type="button"
        onclick={handleConfirm}
        variant={type === "error" ? "destructive" : "default"}
      >
        {okText}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
