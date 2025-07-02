export interface AutoUpdateCheck {
    type?: 'containers' | 'stacks' | 'all';
    resourceIds?: string[];
    forceUpdate?: boolean;
    dryRun?: boolean;
}

export interface AutoUpdateResult {
    success: boolean;
    checked: number;
    updated: number;
    skipped: number;
    failed: number;
    startTime: string;
    endTime: string;
    duration: string;
    results: AutoUpdateResourceResult[];
}

export interface AutoUpdateResourceResult {
    resourceId: string;
    resourceName: string;
    resourceType: 'container' | 'stack';
    status: 'checked' | 'up_to_date' | 'update_available' | 'updated' | 'failed' | 'skipped';
    updateAvailable: boolean;
    updateApplied: boolean;
    oldImages?: Record<string, string>;
    newImages?: Record<string, string>;
    error?: string;
    details?: Record<string, any>;
}

export interface AutoUpdateRecord {
    id: string;
    resourceId: string;
    resourceType: string;
    resourceName: string;
    status: string;
    startTime: string;
    endTime?: string;
    updateAvailable: boolean;
    updateApplied: boolean;
    oldImageVersions?: Record<string, string>;
    newImageVersions?: Record<string, string>;
    error?: string;
    details?: Record<string, any>;
}

export interface AutoUpdateStatus {
    updatingContainers: number;
    updatingStacks: number;
    containerIds: string[];
    stackIds: string[];
}