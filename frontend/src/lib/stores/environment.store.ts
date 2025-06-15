import { writable, get } from 'svelte/store';
import type { Agent } from '$lib/types/agent.type';

export type Environment = Agent & {
	isLocal?: boolean;
	id: string; // Can be 'local' or agent.id
	hostname: string;
};

export const LOCAL_DOCKER_ENVIRONMENT_ID = 'local';

export const localDockerEnvironment: Environment = {
	id: LOCAL_DOCKER_ENVIRONMENT_ID,
	hostname: 'Local Docker',
	platform: 'local',
	version: 'N/A',
	capabilities: [],
	status: 'online',
	lastSeen: new Date().toISOString(),
	registeredAt: new Date().toISOString(),
	createdAt: new Date().toISOString(),
	isLocal: true
};

function createEnvironmentManagementStore() {
	const _selectedEnvironment = writable<Environment | null>(null);
	const _availableEnvironments = writable<Environment[]>([]);
	let _initialized = false;

	function _updateAvailable(agents: Agent[], hasLocalDocker: boolean) {
		const newAvailable: Environment[] = [];
		if (hasLocalDocker) {
			newAvailable.push(localDockerEnvironment);
		}
		newAvailable.push(...agents.map((agent) => ({ ...agent, isLocal: false })));
		_availableEnvironments.set(newAvailable);
		return newAvailable;
	}

	function _selectInitialEnvironment(available: Environment[]): Environment | null {
		if (typeof localStorage !== 'undefined') {
			const savedId = localStorage.getItem('selectedEnvironmentId');
			const found = available.find((env) => env.id === savedId);
			if (found) {
				_selectedEnvironment.set(found);
				return found;
			}
		}
		if (available.includes(localDockerEnvironment)) {
			_selectedEnvironment.set(localDockerEnvironment);
			return localDockerEnvironment;
		}
		if (available.length > 0) {
			_selectedEnvironment.set(available[0]);
			return available[0];
		}
		_selectedEnvironment.set(null);
		return null;
	}

	return {
		selected: {
			subscribe: _selectedEnvironment.subscribe
		},
		available: {
			subscribe: _availableEnvironments.subscribe
		},
		initialize: (agents: Agent[], hasLocalDocker: boolean) => {
			if (_initialized) {
				// If already initialized, this might be an update
				const currentSelected = get(_selectedEnvironment);
				const newAvailable = _updateAvailable(agents, hasLocalDocker);
				// Check if current selected is still valid
				if (currentSelected && !newAvailable.find((env) => env.id === currentSelected.id)) {
					_selectInitialEnvironment(newAvailable);
				} else if (!currentSelected && newAvailable.length > 0) {
					_selectInitialEnvironment(newAvailable);
				}
				return;
			}
			const available = _updateAvailable(agents, hasLocalDocker);
			_selectInitialEnvironment(available);
			_initialized = true;
		},
		setEnvironment: (environment: Environment) => {
			_selectedEnvironment.set(environment);
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('selectedEnvironmentId', environment.id);
			}
		},
		isInitialized: () => _initialized,
		getLocalEnvironment: () => localDockerEnvironment
	};
}

export const environmentStore = createEnvironmentManagementStore();
