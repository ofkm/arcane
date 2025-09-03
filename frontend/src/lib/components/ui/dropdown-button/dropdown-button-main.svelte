<script lang="ts" module>
  import { cn, type WithElementRef } from '$lib/utils.js';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { buttonVariants, type ButtonVariant, type ButtonSize } from '$lib/components/ui/button/button.svelte';

  export type DropdownButtonMainProps = WithElementRef<HTMLButtonAttributes> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  };
</script>

<script lang="ts">
  import { tryUseDropdownButtonRoot } from './dropdown-button.svelte.js';
  const root = tryUseDropdownButtonRoot();

  let {
    class: className,
    variant = root?.variant ?? 'default',
    size = root?.size ?? 'default',
    ref = $bindable(null),
    type = 'button',
    disabled = root?.disabled ?? undefined,
    children,
    ...restProps
  }: DropdownButtonMainProps = $props();
</script>

<button
  bind:this={ref}
  data-slot="dropdown-button-main"
  class={cn(buttonVariants({ variant, size }), 'rounded-r-none border-r-0', className)}
  {type}
  {disabled}
  {...restProps}>
  {@render children?.()}
</button>
