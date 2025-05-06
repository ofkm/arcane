import { dev } from '$app/environment';

// Simply use SvelteKit's built-in dev flag
export const isDev = dev;

// For test environment, we can use a safer approach
export const isTest = false; // Default for browser

export const defaultEnvTemplate = `# Environment Variables
# These variables will be available to your stack services
# Format: VARIABLE_NAME=value

NGINX_HOST=localhost
NGINX_PORT=80

# Example Database Configuration
# DB_USER=myuser
# DB_PASSWORD=mypassword
# DB_NAME=mydatabase
`;

export const defaultComposeTemplate = `
services:
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
