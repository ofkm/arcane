import type Docker from 'dockerode';

export type ServiceImage = Docker.ImageInfo & {
    repo: string;
    tag: string; 
    Architecture?: string;
    Os?: string;
    Config?: {
        User?: string;
        ExposedPorts?: Record<string, any>;
        Env?: string[];
        Entrypoint?: string[];
        WorkingDir?: string;
        Labels?: Record<string, string>;
    };
    GraphDriver?: {
        Data: any;
        Name: string;
    };
    RootFS?: {
        Type: string;
        Layers: string[];
    };
    Metadata?: {
        LastTagTime?: string;
    };
    Descriptor?: {
        mediaType: string;
        digest: string;
        size: number;
    };
};

export interface ImageUpdateInfo {
    hasUpdate: boolean;
    updateType: string;
    currentVersion: string;
    latestVersion?: string;
    currentDigest?: string;
    latestDigest?: string;
    checkTime: string;
    responseTimeMs: number;
    error?: string;
}

export type EnhancedImageInfo = ServiceImage & {
    InUse: boolean;
    updateInfo?: ImageUpdateInfo;
};
