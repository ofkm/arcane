import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';

export type Environment = {
	id: string;
	hostname: string;
	apiUrl: string;
	description?: string;
	status: 'online' | 'offline' | 'error';
	enabled: boolean;
	lastSeen?: string;
	createdAt: string;
	updatedAt?: string;
	isLocal?: boolean;
};

export const LOCAL_DOCKER_ENVIRONMENT_ID = '0';

export const localDockerEnvironment: Environment = {
	id: LOCAL_DOCKER_ENVIRONMENT_ID,
	hostname: 'Local Docker',
	apiUrl: 'http://localhost',
	status: 'online',
	enabled: true,
	lastSeen: new Date().toISOString(),
	createdAt: new Date().toISOString(),
	isLocal: true
};

function createEnvironmentManagementStore() {
	const _selectedEnvironment = writable<Environment | null>(null);
	const _availableEnvironments = writable<Environment[]>([]);
	let _initialized = false;

	let _resolveReadyPromiseFunction: () => void;
	const _readyPromise = new Promise<void>((resolve) => {
		_resolveReadyPromiseFunction = resolve;
	});

	function _updateAvailable(environments: Environment[], hasLocalDocker: boolean) {
		const newAvailable: Environment[] = [];

		if (hasLocalDocker) {
			newAvailable.push(localDockerEnvironment);
		}

		newAvailable.push(...environments.map((env) => ({ ...env, isLocal: false })));
		_availableEnvironments.set(newAvailable);
		return newAvailable;
	}

	function _getSavedEnvironmentId(): string | null {
		if (browser && localStorage) {
			return localStorage.getItem('selectedEnvironmentId');
		}
		return null;
	}

	function _selectInitialEnvironment(available: Environment[]): Environment | null {
		const savedId = _getSavedEnvironmentId();

		if (savedId) {
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
		initialize: async (environmentsData: Environment[], hasLocalDocker: boolean) => {
			const available = _updateAvailable(environmentsData, hasLocalDocker);

			if (!_initialized) {
				_selectInitialEnvironment(available);
				_initialized = true;
				_resolveReadyPromiseFunction();
			} else {
				const currentSelected = get(_selectedEnvironment);
				if (currentSelected && !available.find((env) => env.id === currentSelected.id)) {
					_selectInitialEnvironment(available);
				} else if (!currentSelected && available.length > 0) {
					_selectInitialEnvironment(available);
				}
			}
		},
		setEnvironment: async (environment: Environment) => {
			const currentSelected = get(_selectedEnvironment);

			if (currentSelected?.id !== environment.id) {
				_selectedEnvironment.set(environment);

				if (browser && localStorage) {
					localStorage.setItem('selectedEnvironmentId', environment.id);
				}

				if (browser) {
					await invalidateAll();
				}
			}
		},
		isInitialized: () => _initialized,
		getLocalEnvironment: () => localDockerEnvironment,
		ready: _readyPromise
	};
}

export const environmentStore = createEnvironmentManagementStore();
