import type Docker from 'dockerode';
import type { ContainerCreateOptions, HealthConfig } from 'dockerode';

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

// Container state
export interface ContainerState {
	Status: string;
	Running: boolean;
	Paused: boolean;
	Restarting: boolean;
	OOMKilled: boolean;
	Dead: boolean;
	Pid: number;
	ExitCode: number;
	Error: string;
	StartedAt: string;
	FinishedAt: string;
}

// Container details
export interface ContainerDetails {
	Id: string;
	Names: string[];
	Image: string;
	ImageID: string;
	Command: string;
	Created: number;
	Ports: ContainerPort[];
	Labels: { [label: string]: string };
	State: string;
	Status: string;
	HostConfig: {
		NetworkMode: string;
	};
	NetworkSettings: {
		Networks: {
			[networkName: string]: {
				IPAddress: string;
				Gateway: string;
				MacAddress: string;
			};
		};
	};
	Mounts: Array<{
		Type: string;
		Name?: string;
		Source: string;
		Destination: string;
		Mode: string;
		RW: boolean;
		Propagation: string;
	}>;
}

// Container types
export interface ContainerCreate extends ContainerCreateOptions {
	name?: string; // Container name
}

// Container configuration for creating containers
export interface ContainerConfig {
	name: string;
	image: string;
	ports?: Array<{
		hostPort: string;
		containerPort: string;
	}>;
	volumes?: Array<{
		source: string;
		target: string;
		readOnly?: boolean;
	}>;
	envVars?: Array<{
		key: string;
		value: string;
	}>;
	network?: string;
	restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
	networkConfig?: {
		ipv4Address?: string;
		ipv6Address?: string;
	};
	healthcheck?: HealthConfig;
	labels?: { [key: string]: string };
	command?: string[];
	user?: string;
	memoryLimit?: number;
	cpuLimit?: number;
}

// Container port mapping
export interface ContainerPort {
	IP?: string;
	PrivatePort: number;
	PublicPort?: number;
	Type: string;
}
