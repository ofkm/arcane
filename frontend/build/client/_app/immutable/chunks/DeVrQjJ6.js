const e=`# Environment Variables
# These variables will be available to your stack services
# Format: VARIABLE_NAME=value

NGINX_HOST=localhost
NGINX_PORT=80

# Example Database Configuration
# DB_USER=myuser
# DB_PASSWORD=mypassword
# DB_NAME=mydatabase
`,a=`services:
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
`,s=new Set(["host","bridge","none","ingress"]);export{s as D,e as a,a as d};
