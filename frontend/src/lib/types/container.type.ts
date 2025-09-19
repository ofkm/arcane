// Base Container Types

export interface BaseContainer {
	id: string;
	names: string[];
	image: string;
	imageId: string;
	command: string;
	created: number;
	labels: Record<string, string>;
	state: string;
	status: string;
}

export interface ContainerSummaryDto extends BaseContainer {
	ports: ContainerPorts[];
	hostConfig: ContainerHostConfig;
	networkSettings: ContainerNetworkSettings;
	mounts: ContainerMounts[];
}

export interface ContainerPorts {
	ip?: string;
	privatePort: number;
	publicPort?: number;
	type: string;
}

export interface ContainerHostConfig {
	networkMode: string;
	restartPolicy?: string;
}

export interface ContainerNetworkSettings {
	networks: Record<string, ContainerNetwork>;
}

export interface ContainerMounts {
	type: string;
	name?: string;
	source?: string;
	destination: string;
	driver?: string;
	mode?: string;
	rw?: boolean;
	propagation?: string;
}

export interface ContainerNetwork {
	ipamConfig: any | null;
	links: string[] | null;
	aliases: string[] | null;
	macAddress: string;
	driverOpts: Record<string, string> | null;
	gwPriority: number;
	networkId: string;
	endpointId: string;
	gateway: string;
	ipAddress: string;
	ipPrefixLen: number;
	ipv6Gateway: string;
	globalIPv6Address: string;
	globalIPv6PrefixLen: number;
	dnsNames: string[] | null;
}

// End Base Container Types

export interface ContainerStatusCounts {
	runningContainers: number;
	stoppedContainers: number;
	totalContainers: number;
}

export interface CreateContainerDto {
	name: string;
	image: string;
	command?: string[];
	entrypoint?: string[];
	workingDir?: string;
	user?: string;
	environment?: string[];
	ports?: Record<string, string>;
	volumes?: string[];
	networks?: string[];
	restartPolicy?: string;
	privileged?: boolean;
	autoRemove?: boolean;
	memory?: number;
	cpus?: number;
}

export interface ContainerActionResult {
	started?: string[];
	stopped?: string[];
	failed?: string[];
	success: boolean;
	errors?: string[];
}

export interface ContainerStateDto {
	status: string;
	running: boolean;
	startedAt: string;
	finishedAt: string;
	health?: {
		status: string;
		log?: Array<{
			start?: string;
			Start?: string;
			end?: string;
			End?: string;
			exitCode?: number;
			ExitCode?: number;
			output?: string;
			Output?: string;
		}>;
	};
}

export interface ContainerConfigDto {
	env?: string[];
	cmd?: string[];
	entrypoint?: string[];
	workingDir?: string;
	user?: string;
}

export interface ContainerDetailsDto {
	id: string;
	name: string;
	image: string;
	imageId: string;
	created: string;
	state: ContainerStateDto;
	config: ContainerConfigDto;
	hostConfig: ContainerHostConfig;
	networkSettings: ContainerNetworkSettings;
	ports: ContainerPorts[];
	mounts: ContainerMounts[];
	labels: Record<string, string>;
}
