<script lang="ts" module>
  import { cn, type WithElementRef } from '$lib/utils.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ButtonVariant, ButtonSize } from '$lib/components/ui/button/button.svelte';

  export type DropdownButtonOption = {
    label: string;
    value: string;
    disabled?: boolean;
    onclick?: () => void;
  };

  export type DropdownButtonProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    // Simple mode props
    mainButtonText?: string;
    options?: DropdownButtonOption[];
    onMainButtonClick?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    align?: 'start' | 'center' | 'end';
    disabled?: boolean;
    // Composable mode
    simple?: boolean;
  };
</script>

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  import Main from './dropdown-button-main.svelte';
  import Trigger from './dropdown-button-trigger.svelte';
  import Content from './dropdown-button-content.svelte';
  import Item from './dropdown-button-item.svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    // Simple mode props
    mainButtonText,
    options,
    onMainButtonClick,
    variant = 'default',
    size = 'default',
    align = 'end',
    disabled = false,
    simple = false,
    ...restProps
  }: DropdownButtonProps = $props();

  // Determine if we're in simple mode
  const isSimpleMode = $derived(simple || (mainButtonText && options));

  function handleMainClick() {
    if (onMainButtonClick) {
      onMainButtonClick();
    }
  }

  function handleOptionClick(option: DropdownButtonOption) {
    if (option.onclick) {
      option.onclick();
    }
  }
</script>

{#if isSimpleMode && mainButtonText && options}
  <!-- Simple Mode: All-in-one component -->
  <DropdownMenuPrimitive.Root>
    <div bind:this={ref} data-slot="dropdown-button" class={cn('flex', className)} {...restProps}>
      <Main {variant} {size} {disabled} onclick={handleMainClick}>
        {mainButtonText}
      </Main>

      <DropdownMenuPrimitive.Trigger>
        {#snippet child({ props })}
          <Trigger {variant} {size} {disabled} {...props} />
        {/snippet}
      </DropdownMenuPrimitive.Trigger>
    </div>

    <Content {align} class="min-w-[200px]">
      {#each options as option (option.value)}
        <Item disabled={option.disabled} onclick={() => handleOptionClick(option)}>
          {option.label}
        </Item>
      {/each}
    </Content>
  </DropdownMenuPrimitive.Root>
{:else}
  <!-- Composable Mode: Just the wrapper div -->
  <div bind:this={ref} data-slot="dropdown-button" class={cn('flex', className)} {...restProps}>
    {@render children?.()}
  </div>
{/if}
