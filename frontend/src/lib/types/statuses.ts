export const statusVariantMap: Record<string, 'red' | 'purple' | 'green' | 'blue' | 'gray' | 'amber'> = {
	running: 'green',
	deployed: 'green',
	stopped: 'red',
	failed: 'red',
	pending: 'amber',
	creating: 'blue',
	updating: 'blue',
	deleting: 'purple'
};
