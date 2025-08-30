import { tv, type VariantProps } from 'tailwind-variants';

import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
import PlayIcon from '@lucide/svelte/icons/play';
import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
import DownloadIcon from '@lucide/svelte/icons/download';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import RefreshCcwDotIcon from '@lucide/svelte/icons/refresh-ccw-dot';
import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import EditIcon from '@lucide/svelte/icons/edit';
import CheckIcon from '@lucide/svelte/icons/check';
import XIcon from '@lucide/svelte/icons/x';
import SaveIcon from '@lucide/svelte/icons/save';
import PlusCircleIcon from '@lucide/svelte/icons/plus-circle';
import LayoutTemplateIcon from '@lucide/svelte/icons/layout-template';

export const arcaneButtonVariants = tv({
	base:
		'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap select-none ' +
		'transition-[transform,box-shadow,background-color,border-color,color] duration-150 will-change-transform hover:-translate-y-0.5 active:translate-y-0 ' +
		'border disabled:pointer-events-none disabled:opacity-50 ' +
		'focus-visible:outline-none focus-visible:ring-0 ring-0 ring-offset-0 ' +
		"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	variants: {
		tone: {
			'outline-primary':
				'bg-transparent text-muted-foreground border-primary/70 hover:bg-primary/15 hover:border-primary/75 ' +
				'dark:text-muted-foreground dark:border-primary/60 dark:hover:bg-primary/20 shadow-none hover:shadow-none',
			'outline-destructive':
				'bg-transparent text-destructive/75 border-destructive/60 hover:bg-destructive/10 hover:border-destructive/65 ' +
				'dark:text-destructive/75 dark:border-destructive/55 dark:hover:bg-destructive/14 shadow-none hover:shadow-none',

			ghost: 'border-transparent bg-transparent text-foreground hover:bg-accent/40 shadow-none hover:shadow-none',
			link: 'border-transparent bg-transparent text-primary underline-offset-4 hover:underline shadow-none hover:shadow-none'
		},
		size: {
			default: 'h-9 px-4 py-2 has-[>svg]:px-3',
			sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
			lg: 'h-10 rounded-md px-5 has-[>svg]:px-4',
			icon: 'size-9'
		}
	},
	defaultVariants: {
		tone: 'outline-primary',
		size: 'default'
	}
});

export type ArcaneButtonTone = VariantProps<typeof arcaneButtonVariants>['tone'];
export type ArcaneButtonSize = VariantProps<typeof arcaneButtonVariants>['size'];

export type Action =
	| 'start'
	| 'deploy'
	| 'stop'
	| 'restart'
	| 'remove'
	| 'pull'
	| 'redeploy'
	| 'inspect'
	| 'logs'
	| 'edit'
	| 'confirm'
	| 'cancel'
	| 'save'
	| 'create'
	| 'template';

export type IconCtor = typeof PlayIcon;

export type ActionConfig = {
	defaultLabel: string;
	IconComponent: IconCtor;
	tone: ArcaneButtonTone;
	loadingLabel?: string;
};

export const actionConfigs: Record<Action, ActionConfig> = {
	start: { defaultLabel: 'Start', IconComponent: PlayIcon, tone: 'outline-primary', loadingLabel: 'Starting...' },
	deploy: { defaultLabel: 'Deploy', IconComponent: PlayIcon, tone: 'outline-primary', loadingLabel: 'Deploying...' },
	stop: { defaultLabel: 'Stop', IconComponent: CircleStopIcon, tone: 'outline-destructive', loadingLabel: 'Stopping...' },
	remove: { defaultLabel: 'Remove', IconComponent: Trash2Icon, tone: 'outline-destructive', loadingLabel: 'Removing...' },
	restart: { defaultLabel: 'Restart', IconComponent: RotateCcwIcon, tone: 'outline-primary', loadingLabel: 'Restarting...' },
	pull: { defaultLabel: 'Pull', IconComponent: DownloadIcon, tone: 'outline-primary', loadingLabel: 'Pulling...' },
	redeploy: {
		defaultLabel: 'Redeploy',
		IconComponent: RefreshCcwDotIcon,
		tone: 'outline-primary',
		loadingLabel: 'Redeploying...'
	},
	inspect: { defaultLabel: 'Inspect', IconComponent: ScanSearchIcon, tone: 'outline-primary', loadingLabel: 'Inspecting...' },
	edit: { defaultLabel: 'Edit', IconComponent: EditIcon, tone: 'outline-primary', loadingLabel: 'Saving...' },
	confirm: { defaultLabel: 'Confirm', IconComponent: CheckIcon, tone: 'outline-primary', loadingLabel: 'Confirming...' },
	save: { defaultLabel: 'Save', IconComponent: SaveIcon, tone: 'outline-primary', loadingLabel: 'Saving...' },
	create: { defaultLabel: 'Create', IconComponent: PlusCircleIcon, tone: 'outline-primary', loadingLabel: 'Creating...' },
	template: {
		defaultLabel: 'Use Template',
		IconComponent: LayoutTemplateIcon,
		tone: 'outline-primary',
		loadingLabel: 'Creating...'
	},
	logs: { defaultLabel: 'Logs', IconComponent: FileTextIcon, tone: 'ghost', loadingLabel: 'Fetching...' },
	cancel: { defaultLabel: 'Cancel', IconComponent: XIcon, tone: 'ghost', loadingLabel: 'Cancelling...' }
};
