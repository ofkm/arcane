export type StackActions =
	| 'start'
	| 'stop'
	| 'restart'
	| 'redeploy'
	| 'import'
	| 'destroy'
	| 'pull'
	| 'migrate'
	| 'update';
export type ContainerActions = 'start' | 'stop' | 'restart' | 'pull' | 'remove';
export type PruneType = 'containers' | 'images' | 'networks' | 'volumes';
