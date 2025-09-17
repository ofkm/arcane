#!/bin/bash

# Arcane Development Environment Manager
# This script helps manage the Docker-based development environment with hot reloading

set -euo pipefail

# Configuration
readonly COMPOSE_FILE="docker-compose.dev.yml"
readonly PROJECT_NAME="arcane-dev"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

install_docker() {
    local platform arch
    platform="$(uname -s | tr '[:upper:]' '[:lower:]')"
    arch="$(uname -m)"
    
    log_info "Installing Docker using download script..."
    if ! "${SCRIPT_DIR}/download-docker.sh" "$platform" "$arch" "28.4.0"; then
        log_error "Failed to install Docker"
        return 1
    fi
    
    # Add to PATH for current session
    export PATH="${PROJECT_ROOT}/dist:$PATH"
    log_success "Docker installed successfully"
    return 0
}

install_compose() {
    local dest="${PROJECT_ROOT}/dist/docker-compose"
    
    log_info "Installing Docker Compose using download script..."
    if ! "${SCRIPT_DIR}/download-compose.sh" "2.39.2" "$dest"; then
        log_error "Failed to install Docker Compose"
        return 1
    fi
    
    # Add to PATH for current session
    export PATH="${PROJECT_ROOT}/dist:$PATH"
    log_success "Docker Compose installed successfully"
    return 0
}

offer_installation() {
    local missing_tools=()
    local install_docker=false
    local install_compose=false
    
    # Check what's missing
    if ! command -v docker &> /dev/null; then
        missing_tools+=("Docker")
        install_docker=true
    fi
    
    if ! docker compose version &> /dev/null 2>&1; then
        missing_tools+=("Docker Compose")
        install_compose=true
    fi
    
    if [[ ${#missing_tools[@]} -eq 0 ]]; then
        return 0
    fi
    
    log_warning "Missing required tools: ${missing_tools[*]}"
    echo
    log_info "We can automatically install these tools for you using the project's download scripts."
    log_info "The tools will be installed locally in the project directory (${PROJECT_ROOT}/dist/)"
    echo
    
    read -p "Would you like to install the missing tools automatically? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Installation cancelled."
        log_info "Please install Docker and Docker Compose manually, then run this script again."
        return 1
    fi
    
    # Install missing tools
    if [[ $install_docker == true ]]; then
        if ! install_docker; then
            return 1
        fi
    fi
    
    if [[ $install_compose == true ]]; then
        if ! install_compose; then
            return 1
        fi
    fi
    
    log_success "All required tools installed successfully!"
    echo
    return 0
}

check_requirements() {
    local docker_available=true
    local daemon_running=true
    local compose_available=true
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        docker_available=false
    fi
    
    # Check if Docker daemon is running (only if Docker is available)
    if [[ $docker_available == true ]] && ! docker info &> /dev/null; then
        daemon_running=false
    fi
    
    # Check if Docker Compose is available
    if ! docker compose version &> /dev/null; then
        compose_available=false
    fi
    
    # If Docker or Compose are missing, offer installation
    if [[ $docker_available == false ]] || [[ $compose_available == false ]]; then
        if ! offer_installation; then
            exit 1
        fi
        
        # Re-check after installation
        if ! command -v docker &> /dev/null; then
            log_error "Docker installation failed or is not in PATH"
            exit 1
        fi
        
        if ! docker compose version &> /dev/null; then
            log_error "Docker Compose installation failed or is not in PATH"
            exit 1
        fi
    fi
    
    # Check Docker daemon (after ensuring Docker is installed)
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        log_error "Please start Docker Desktop or the Docker daemon and try again"
        exit 1
    fi
    
    log_info "All requirements satisfied ✓"
}

ensure_project_root() {
    if [[ ! -f "${PROJECT_ROOT}/${COMPOSE_FILE}" ]]; then
        log_error "Could not find ${COMPOSE_FILE} in project root"
        log_error "Please run this script from the project root directory or ensure the compose file exists"
        exit 1
    fi
    
    # Change to project root to ensure relative paths work correctly
    cd "${PROJECT_ROOT}"
}

show_status() {
    log_info "Development environment status:"
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
}

show_logs() {
    local service="${1:-}"
    
    if [[ -z "$service" ]]; then
        log_info "Showing logs for all services..."
        docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" logs -f
    else
        # Validate service name
        if [[ ! "$service" =~ ^(frontend|backend)$ ]]; then
            log_error "Invalid service name: $service"
            log_error "Valid services: frontend, backend"
            exit 1
        fi
        
        log_info "Showing logs for service: $service"
        docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" logs -f "$service"
    fi
}

create_env_file() {
    local env_file=".env"
    
    if [[ -f "$env_file" ]]; then
        return 0
    fi
    
    log_warning ".env file not found, creating basic development configuration..."
    cat > "$env_file" << 'EOF'
# Development Environment Configuration
# WARNING: These are development-only values, never use in production!

ENCRYPTION_KEY=dev-encryption-key-replace-in-production-must-be-32-chars
JWT_SECRET=dev-jwt-secret-replace-in-production-must-be-long-enough
DATABASE_TYPE=sqlite
DATABASE_PATH=/app/data/arcane.db
GIN_MODE=debug
ENVIRONMENT=development
EOF
    log_success "Created .env file with development defaults"
}

start_dev() {
    log_info "Starting Arcane development environment..."
    
    create_env_file
    
    if ! docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" up -d --build; then
        log_error "Failed to start development environment"
        exit 1
    fi
    
    log_success "Development environment started!"
    log_info "Frontend: http://localhost:3000"
    log_info "Backend:  http://localhost:3552"
    log_info ""
    log_info "Use './scripts/development/dev.sh logs' to view logs"
    log_info "Use './scripts/development/dev.sh logs frontend' or './scripts/development/dev.sh logs backend' for specific service logs"
}

stop_dev() {
    log_info "Stopping Arcane development environment..."
    if ! docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" down; then
        log_error "Failed to stop development environment"
        exit 1
    fi
    log_success "Development environment stopped!"
}

restart_dev() {
    log_info "Restarting Arcane development environment..."
    if ! docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" restart; then
        log_error "Failed to restart development environment"
        exit 1
    fi
    log_success "Development environment restarted!"
}

clean_dev() {
    log_warning "This will remove all containers, networks, and volumes for the development environment."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up development environment..."
        if ! docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" down -v --remove-orphans; then
            log_error "Failed to remove containers and volumes"
            exit 1
        fi
        
        if ! docker system prune -f; then
            log_warning "Failed to prune Docker system, but containers were removed"
        fi
        
        log_success "Development environment cleaned!"
    else
        log_info "Cleanup cancelled."
    fi
}

rebuild_dev() {
    log_info "Rebuilding development environment..."
    
    if ! docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" down; then
        log_error "Failed to stop containers"
        exit 1
    fi
    
    if ! docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" build --no-cache; then
        log_error "Failed to rebuild containers"
        exit 1
    fi
    
    if ! docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" up -d; then
        log_error "Failed to start containers"
        exit 1
    fi
    
    log_success "Development environment rebuilt and started!"
}

shell_into() {
    local service="${1:-}"
    
    if [[ -z "$service" ]]; then
        log_error "Please specify a service: frontend or backend"
        exit 1
    fi
    
    # Validate service name
    if [[ ! "$service" =~ ^(frontend|backend)$ ]]; then
        log_error "Invalid service name: $service"
        log_error "Valid services: frontend, backend"
        exit 1
    fi
    
    log_info "Opening shell in $service container..."
    if ! docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" exec "$service" /bin/sh; then
        log_error "Failed to open shell in $service container"
        log_error "Make sure the container is running: ./scripts/development/dev.sh status"
        exit 1
    fi
}

show_help() {
    echo "Arcane Development Environment Manager"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start     Start the development environment"
    echo "  stop      Stop the development environment"
    echo "  restart   Restart the development environment"
    echo "  status    Show status of all services"
    echo "  logs      Show logs (optionally specify service: frontend, backend)"
    echo "  clean     Remove all containers, networks, and volumes"
    echo "  rebuild   Rebuild and restart the development environment"
    echo "  shell     Open shell in a service container (specify: frontend or backend)"
    echo "  help      Show this help message"
    echo
    echo "Features:"
    echo "  • Automatic Docker/Compose installation if missing (using project scripts)"
    echo "  • Hot reload for both frontend (Vite) and backend (Air)"
    echo "  • Interactive log viewing with service selection"
    echo "  • Automatic project root detection"
    echo
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs backend"
    echo "  $0 shell frontend"
    echo
    echo "Note: If Docker or Docker Compose are not installed, you'll be prompted"
    echo "      to install them automatically using the project's download scripts."
}

# Main script logic
main() {
    # Check requirements and ensure we're in the right directory
    check_requirements
    ensure_project_root
    
    local command="${1:-help}"
    
    case "$command" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    clean)
        clean_dev
        ;;
    rebuild)
        rebuild_dev
        ;;
    shell)
        shell_into "${2:-}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $command"
        echo
        show_help
        exit 1
        ;;
    esac
}

# Run main function with all arguments
main "$@"