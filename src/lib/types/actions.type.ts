export type StackActions = 'start' | 'stop' | 'restart' | 'redeploy' | 'import' | 'destroy' | 'pull' | 'migrate';
export type ContainerActions = 'start' | 'stop' | 'restart' | 'pull' | 'remove';
export type PruneType = 'containers' | 'images' | 'networks' | 'volumes';
