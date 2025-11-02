import type { Command } from '../types';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import SettingsIcon from '@lucide/svelte/icons/settings';
import TrashIcon from '@lucide/svelte/icons/trash-2';

/**
 * Creates system-related commands
 */
export function createSystemCommands(): Command {
	return {
		id: 'system',
		label: 'System',
		description: 'System management actions',
		icon: SettingsIcon,
		keywords: ['system', 'docker', 'manage'],
		category: 'System',
		subCommands: [
			{
				id: 'system.prune',
				label: 'Prune System',
				description: 'Remove unused containers, networks, images, and volumes',
				icon: TrashIcon,
				keywords: ['prune', 'clean', 'cleanup', 'remove', 'unused', 'system'],
				action: async () => {
					const currentPath = page.url.pathname;
					if (currentPath !== '/dashboard') {
						await goto('/dashboard');
					}
					window.dispatchEvent(new CustomEvent('command:open-prune-dialog'));
				}
			}
		]
	};
}
