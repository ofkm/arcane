<script lang="ts">
  import StatusBadge from "./status-badge.svelte";

  interface Props {
    name: string;
    inUse: boolean | undefined;
  }

  let { name, inUse }: Props = $props();
</script>

<div class="flex items-center gap-2">
  <span class="truncate">{name}</span>
  {#if !inUse}
    <StatusBadge text="Unused" variant="amber" />
  {/if}
</div>
