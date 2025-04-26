export type ServiceNetwork = {
    id: string;
    name: string;
    driver: string;
    scope: string;
    subnet: string | null;
    gateway: string | null;
    created: string;
};