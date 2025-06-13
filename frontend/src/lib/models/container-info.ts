export type ContainerInfo = {
	Id: string;
	Names: string[];
	Image: string;
	ImageID: string;
	Command: string;
	Created: number;
	Ports: Array<{
		IP?: string;
		PrivatePort: number;
		PublicPort?: number;
		Type: string;
	}>;
	Labels: Record<string, string> | null;
	State: string;
	Status: string;
	HostConfig: {
		NetworkMode?: string;
		[key: string]: any;
	};
	NetworkSettings: {
		Networks?: Record<string, any>;
		[key: string]: any;
	};
	Mounts: Array<{
		Type: string;
		Source: string;
		Destination: string;
		Mode: string;
		[key: string]: any;
	}>;
	// Add common fields that might be missing
	SizeRw?: number;
	SizeRootFs?: number;
};

export type EnhancedContainerInfo = ContainerInfo & {
	displayName: string;
	statusSortValue: number;
};
