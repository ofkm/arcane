import type Docker from 'dockerode';

export type ServiceContainer = {
	id: string;
	names: string[];
	name: string;
	image: string;
	imageId: string;
	command: string;
	created: number;
	state: string;
	status: string;
	ports: Docker.Port[];
};