/**
 * Command Registry
 * Central registry for all commands in the application
 */

import type { Command } from './types';

class CommandRegistry {
	private commands = $state<Map<string, Command>>(new Map());

	/**
	 * Register a new command
	 */
	register(command: Command): () => void {
		this.commands.set(command.id, command);

		// Return unregister function
		return () => {
			this.commands.delete(command.id);
		};
	}

	/**
	 * Register multiple commands at once
	 */
	registerMany(commands: Command[]): () => void {
		const unregisterFns = commands.map((cmd) => this.register(cmd));

		// Return function to unregister all
		return () => {
			unregisterFns.forEach((fn) => fn());
		};
	}

	/**
	 * Unregister a command by ID
	 */
	unregister(commandId: string): void {
		this.commands.delete(commandId);
	}

	/**
	 * Get a command by ID
	 */
	get(commandId: string): Command | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * Get all registered commands
	 */
	getAll(): Command[] {
		return Array.from(this.commands.values()).filter((cmd) => {
			// Filter out commands that don't meet their condition
			if (cmd.condition && !cmd.condition()) {
				return false;
			}
			return true;
		});
	}

	/**
	 * Execute a command by ID
	 */
	async execute(commandId: string): Promise<void> {
		const command = this.commands.get(commandId);
		if (!command) {
			console.warn(`Command not found: ${commandId}`);
			return;
		}

		// Check condition before executing
		if (command.condition && !command.condition()) {
			console.warn(`Command condition not met: ${commandId}`);
			return;
		}

		// Only execute action if it exists (commands with subCommands don't need actions)
		if (command.action) {
			await command.action();
		}
	}

	/**
	 * Get sub-commands for a command
	 */
	getSubCommands(commandId: string): Command[] {
		const command = this.commands.get(commandId);
		if (!command || !command.subCommands) {
			return [];
		}

		// Filter sub-commands by their conditions
		return command.subCommands.filter((cmd) => {
			if (cmd.condition && !cmd.condition()) {
				return false;
			}
			return true;
		});
	}

	/**
	 * Search commands by query with smart matching
	 * Prioritizes: starts-with > word boundaries > contains
	 */
	search(query: string): Command[] {
		const normalizedQuery = query.toLowerCase().trim();

		if (!normalizedQuery) {
			return this.getAll();
		}

		const results: { command: Command; score: number }[] = [];
		const topLevelCommands = this.getAll();

		// Smart matching function that returns a score (higher = better match)
		// Only matches at word boundaries - no substring matching
		const getMatchScore = (cmd: Command): number => {
			let score = 0;
			const label = cmd.label.toLowerCase();
			const description = cmd.description?.toLowerCase() || '';
			const keywords = cmd.keywords?.map((k) => k.toLowerCase()) || [];
			const category = cmd.category?.toLowerCase() || '';

			// Exact match (highest priority)
			if (label === normalizedQuery) return 1000;

			// Starts with query (very high priority)
			if (label.startsWith(normalizedQuery)) {
				score += 100;
			}

			// Word boundary match in label (high priority)
			// e.g., "ke" matches "Keyboard" or "View Keyboard" but NOT "Docker"
			const labelWords = label.split(/[\s-_/]+/);
			for (const word of labelWords) {
				if (word.startsWith(normalizedQuery)) {
					score += 50;
					break;
				}
			}

			// Description starts with (medium priority)
			if (description.startsWith(normalizedQuery)) {
				score += 15;
			}

			// Word boundary match in description
			const descWords = description.split(/[\s-_/]+/);
			for (const word of descWords) {
				if (word.startsWith(normalizedQuery)) {
					score += 12;
					break;
				}
			}

			// Keyword exact match (medium priority)
			if (keywords.some((k) => k === normalizedQuery)) {
				score += 15;
			}

			// Keyword starts with (lower priority)
			if (keywords.some((k) => k.startsWith(normalizedQuery))) {
				score += 10;
			}

			// Category match (lower priority)
			if (category.startsWith(normalizedQuery)) {
				score += 8;
			}

			return score;
		};

		// Search through all commands including sub-commands
		for (const cmd of topLevelCommands) {
			const score = getMatchScore(cmd);
			if (score > 0) {
				results.push({ command: cmd, score });
			}

			// Search through sub-commands
			if (cmd.subCommands) {
				for (const subCmd of cmd.subCommands) {
					const subScore = getMatchScore(subCmd);
					if (subScore > 0) {
						// Ensure sub-commands inherit parent category if they don't have one
						const subCommandWithCategory = {
							...subCmd,
							category: subCmd.category || cmd.category || 'General'
						};
						results.push({ command: subCommandWithCategory, score: subScore });
					}
				}
			}
		}

		// Sort by score (highest first) and return commands
		return results.sort((a, b) => b.score - a.score).map((r) => r.command);
	}

	/**
	 * Clear all commands
	 */
	clear(): void {
		this.commands.clear();
	}
}

// Export singleton instance
export const commandRegistry = new CommandRegistry();
