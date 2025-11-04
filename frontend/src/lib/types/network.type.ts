import type { IPAM } from 'dockerode';

export interface NetworkCreateDto {
	Driver?: string;
	CheckDuplicate?: boolean;
	Internal?: boolean;
	Attachable?: boolean;
	Ingress?: boolean;
	IPAM?: IPAM;
	EnableIPv6?: boolean;
	Options?: Record<string, string>;
	Labels?: Record<string, string>;
}

export interface NetworkCreateRequest {
	name: string;
	options: NetworkCreateDto;
}

export interface NetworkUsageCounts {
	networksInuse: number;
	networksUnused: number;
	totalNetworks: number;
}

export interface IPAMConfig {
	driver?: string;
	config?: IPAMSubnet[];
	options?: Record<string, string>;
}

export interface IPAMSubnet {
	subnet?: string;
	gateway?: string;
	ipRange?: string;
	auxAddress?: Record<string, string>;
}

export interface NetworkConfigFrom {
	Network: string;
}

export interface ContainerEndpoint {
	Name: string;
	EndpointID: string;
	MacAddress: string;
	IPv4Address: string;
	IPv6Address: string;
}

export interface NetworkInspect {
	Name: string;
	ID: string;
	Created: string;
	Scope: string;
	Driver: string;
	EnableIPv6: boolean;
	IPAM?: IPAM;
	Internal: boolean;
	Attachable: boolean;
	Ingress: boolean;
	ConfigFrom?: NetworkConfigFrom;
	ConfigOnly: boolean;
	Containers?: Record<string, ContainerEndpoint> | null;
	Options?: Record<string, string> | null;
	Labels?: Record<string, string> | null;
}

export interface NetworkEndpointSettings {
	ipamConfig?: EndpointIPAMConfig;
	links?: string[];
	aliases?: string[];
	networkId?: string;
	endpointId?: string;
	gateway?: string;
	ipAddress?: string;
	ipPrefixLen?: number;
	ipv6Gateway?: string;
	globalIPv6Address?: string;
	globalIPv6PrefixLen?: number;
	macAddress?: string;
	driverOpts?: Record<string, string>;
}

export interface EndpointIPAMConfig {
	ipv4Address?: string;
	ipv6Address?: string;
	linkLocalIPs?: string[];
}

export interface ContainerEndpointDto {
	Name: string;
	EndpointID: string;
	MacAddress: string;
	IPv4Address: string;
	IPv6Address: string;
}

export interface IPAMSubnetDto {
	Subnet: string;
	Gateway?: string;
	IPRange?: string;
	// Support both keys we see in Docker variants
	AuxAddress?: Record<string, string>;
	AuxiliaryAddresses?: Record<string, string>;
}

export interface IPAMDto {
	Driver: string;
	Options?: Record<string, string>;
	Config?: IPAMSubnetDto[];
}

export interface NetworkSummaryDto {
	id: string;
	name: string;
	driver: string;
	scope: string;
	created: string; // ISO RFC3339 string
	options?: Record<string, string> | null;
	labels?: Record<string, string> | null;
	inUse: boolean;
}

export interface NetworkInspectDto {
	id: string;
	name: string;
	driver: string;
	scope: string;
	created: string;
	options?: Record<string, string> | null;
	labels?: Record<string, string> | null;
	containers?: Record<string, ContainerEndpointDto> | null;
	ipam?: IPAMDto;
	internal: boolean;
	attachable: boolean;
	ingress: boolean;
	enableIPv6?: boolean;
}
