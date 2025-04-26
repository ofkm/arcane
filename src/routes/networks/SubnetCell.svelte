<!-- filepath: /Users/kylemendell/dev/ofkm/arcane/src/routes/networks/SubnetCell.svelte -->
<script lang="ts">
  interface Props {
    subnet: string | null;
  }

  let { subnet }: Props = $props();
</script>

{#if subnet}
  <span class="font-mono text-xs">{subnet}</span>
{:else}
  <span>N/A</span>
{/if}
