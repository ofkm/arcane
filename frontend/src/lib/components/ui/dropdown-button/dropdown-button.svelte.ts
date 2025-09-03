import { Context } from 'runed';
import type { ButtonSize, ButtonVariant } from '$lib/components/ui/button/button.svelte';

export type DropdownButtonCtx = {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
  align: 'start' | 'center' | 'end';
};

const ctx = new Context<DropdownButtonCtx>('dropdown-button-root');

export function provideDropdownButtonRoot(props: DropdownButtonCtx) {
  return ctx.set(props);
}

export function useDropdownButtonRoot() {
  return ctx.get();
}

export function tryUseDropdownButtonRoot(): DropdownButtonCtx | null {
  try {
    return ctx.get();
  } catch {
    return null;
  }
}
