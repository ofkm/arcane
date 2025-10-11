import { PersistedState } from 'runed';
import { invalidateAll } from '$app/navigation';
import type { Environment } from '$lib/types/environment.type';

export const LOCAL_DOCKER_ENVIRONMENT_ID = '0';

export const localDockerEnvironment: Environment = {
	id: LOCAL_DOCKER_ENVIRONMENT_ID,
	name: 'Local Docker',
	apiUrl: 'http://localhost',
	status: 'online',
	enabled: true,
	lastSeen: new Date().toISOString(),
	createdAt: new Date().toISOString(),
	isLocal: true
};

function createEnvironmentManagementStore() {
	const selectedEnvironmentId = new PersistedState<string | null>('selectedEnvironmentId', null);

	let _selectedEnvironment = $state<Environment | null>(null);
	let _availableEnvironments = $state<Environment[]>([]);
	let _initialized = false;
	let _initializedWithData = false;

	let _resolveReadyPromiseFunction: () => void;
	const _readyPromise = new Promise<void>((resolve) => {
		_resolveReadyPromiseFunction = resolve;
	});

	function _updateAvailable(environments: Environment[], hasLocalDocker: boolean): Environment[] {
		const newAvailable: Environment[] = [];

		if (hasLocalDocker) {
			newAvailable.push(localDockerEnvironment);
		}

		newAvailable.push(...environments.map((env) => ({ ...env, isLocal: false })));
		_availableEnvironments = newAvailable;
		return newAvailable;
	}

	function _selectInitialEnvironment(available: Environment[]): Environment | null {
		const savedId = selectedEnvironmentId.current;

		if (savedId) {
			const found = available.find((env) => env.id === savedId);
			if (found) {
				_selectedEnvironment = found;
				return found;
			}
		}

		if (available.some((env) => env.id === localDockerEnvironment.id)) {
			_selectedEnvironment = localDockerEnvironment;
			return localDockerEnvironment;
		}

		if (available.length > 0) {
			_selectedEnvironment = available[0];
			return available[0];
		}

		_selectedEnvironment = null;
		return null;
	}

	return {
		get selected(): Environment | null {
			return _selectedEnvironment;
		},
		get available(): Environment[] {
			return _availableEnvironments;
		},
		initialize: async (environmentsData: Environment[], hasLocalDocker: boolean) => {
			const available = _updateAvailable(environmentsData, hasLocalDocker);
			const hasRealEnvironments = environmentsData.length > 0;

			if (!_initialized) {
				_selectInitialEnvironment(available);
				_initialized = true;
				if (hasRealEnvironments) {
					_initializedWithData = true;
				}
				_resolveReadyPromiseFunction();
			} else if (hasRealEnvironments && !_initializedWithData) {
				_selectInitialEnvironment(available);
				_initializedWithData = true;
			} else {
				if (_selectedEnvironment && !available.find((env) => env.id === _selectedEnvironment!.id)) {
					_selectInitialEnvironment(available);
				} else if (!_selectedEnvironment && available.length > 0) {
					_selectInitialEnvironment(available);
				}
			}
		},
		setEnvironment: async (environment: Environment) => {
			if (_selectedEnvironment?.id !== environment.id) {
				_selectedEnvironment = environment;
				selectedEnvironmentId.current = environment.id;
				await invalidateAll();
			}
		},
		isInitialized: () => _initialized,
		getLocalEnvironment: () => localDockerEnvironment,
		ready: _readyPromise,
		getCurrentEnvironmentId: async (): Promise<string> => {
			await _readyPromise;
			return _selectedEnvironment ? _selectedEnvironment.id : LOCAL_DOCKER_ENVIRONMENT_ID;
		}
	};
}

export const environmentStore = createEnvironmentManagementStore();
