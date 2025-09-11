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

export interface ContainerStatusCounts {
	runningContainers: number;
	stoppedContainers: number;
	totalContainers: number;
}

export interface PortDto {
	ip?: string;
	privatePort: number;
	publicPort?: number;
	type: string;
}

export interface MountDto {
	type: string;
	name?: string;
	source?: string;
	destination: string;
	driver?: string;
	mode?: string;
	rw?: boolean;
	propagation?: string;
}

export interface NetworkDto {
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

export interface HostConfigDto {
	networkMode: string;
	restartPolicy?: string;
}

export interface NetworkSettingsDto {
	networks: Record<string, NetworkDto>;
}

export interface ContainerSummaryDto extends BaseContainer {
	ports: PortDto[];
	hostConfig: HostConfigDto;
	networkSettings: NetworkSettingsDto;
	mounts: MountDto[];
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
	hostConfig: HostConfigDto;
	networkSettings: NetworkSettingsDto;
	ports: PortDto[];
	mounts: MountDto[];
	labels: Record<string, string>;
}
