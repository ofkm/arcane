export const TEST_COMPOSE_YAML = `services:
  redis:
    image: redis:latest
    container_name: \${CONTAINER_NAME}
    ports:
      - "8081:81"
      - "6379:6379"
      - "6378:6378"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
    driver: local
`;

export const TEST_ENV_FILE = `CONTAINER_NAME=test-redis-container
`;
