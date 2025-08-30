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

export const DEFAULT_NETWORK_NAMES = new Set(['host', 'bridge', 'none', 'ingress']);
