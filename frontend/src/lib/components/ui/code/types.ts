/*
	Installed from @ieedan/shadcn-svelte-extras
*/

import type { WithChildren, WithoutChildren } from 'bits-ui';
import type { CodeVariant } from '.';
import type { SupportedLanguage } from './shiki';
import type { HTMLAttributes } from 'svelte/elements';
import type { CopyButtonPropsWithoutHTML } from '$lib/components/ui/copy-button/types';

export type CodeRootPropsWithoutHTML = WithChildren<{
	ref?: HTMLDivElement | null;
	variant?: CodeVariant;
	lang?: SupportedLanguage;
	code: string;
	class?: string;
	hideLines?: boolean;
	highlight?: (number | [number, number])[];
}>;

export type CodeRootProps = CodeRootPropsWithoutHTML &
	WithoutChildren<HTMLAttributes<HTMLDivElement>>;

export type CodeCopyButtonPropsWithoutHTML = Omit<CopyButtonPropsWithoutHTML, 'text'>;

export type CodeCopyButtonProps = CodeCopyButtonPropsWithoutHTML &
	WithoutChildren<HTMLAttributes<HTMLButtonElement>>;

export type CodeOverflowPropsWithoutHTML = WithChildren<{
	collapsed?: boolean;
}>;

export type CodeOverflowProps = CodeOverflowPropsWithoutHTML &
	WithoutChildren<HTMLAttributes<HTMLDivElement>>;
