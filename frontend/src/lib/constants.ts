export const defaultEnvTemplate = `# Environment Variables
# Format: VARIABLE_NAME=value
`;

export const defaultComposeTemplate = `services:
  nginx:
    image: nginx:alpine
    container_name: nginx_service
    env_file:
      - .env
    ports:
      - "8080:80"
    volumes:
      - nginx_data:/usr/share/nginx/html
    restart: unless-stopped

volumes:
  nginx_data:
    driver: local
`;

/* The line `const DEFAULT_NETWORK_NAMES = new Set(['host', 'bridge', 'none', 'ingress']);` is creating
a Set named `DEFAULT_NETWORK_NAMES` that contains the default network names managed by Docker. These
default network names are 'host', 'bridge', 'none', and 'ingress'. The purpose of this set is to
provide a quick and efficient way to check if a given network name is one of the default networks
when needed in the code. */
export const DEFAULT_NETWORK_NAMES = new Set(['host', 'bridge', 'none', 'ingress']);
