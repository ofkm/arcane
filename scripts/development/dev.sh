#!/bin/bash

# Arcane Development Environment Manager
# This script helps manage the Docker-based development environment with hot reloading

set -e

COMPOSE_FILE="docker-compose.dev.yml"
PROJECT_NAME="arcane-dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
}

check_compose() {
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        exit 1
    fi
}

show_status() {
    log_info "Development environment status:"
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
}

show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        log_info "Showing logs for all services..."
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
    else
        log_info "Showing logs for service: $service"
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f "$service"
    fi
}

start_dev() {
    log_info "Starting Arcane development environment..."
    
    # Check if .env file exists, create a basic one if not
    if [ ! -f .env ]; then
        log_warning ".env file not found, creating basic development configuration..."
        cat > .env << EOF
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
    fi
    
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d --build
    
    log_success "Development environment started!"
    log_info "Frontend: http://localhost:3000"
    log_info "Backend:  http://localhost:3552"
    log_info ""
    log_info "Use './scripts/development/dev.sh logs' to view logs"
    log_info "Use './scripts/development/dev.sh logs frontend' or './scripts/development/dev.sh logs backend' for specific service logs"
}

stop_dev() {
    log_info "Stopping Arcane development environment..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down
    log_success "Development environment stopped!"
}

restart_dev() {
    log_info "Restarting Arcane development environment..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME restart
    log_success "Development environment restarted!"
}

clean_dev() {
    log_warning "This will remove all containers, networks, and volumes for the development environment."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up development environment..."
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v --remove-orphans
        docker system prune -f
        log_success "Development environment cleaned!"
    else
        log_info "Cleanup cancelled."
    fi
}

rebuild_dev() {
    log_info "Rebuilding development environment..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME build --no-cache
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
    log_success "Development environment rebuilt and started!"
}

shell_into() {
    local service=$1
    if [ -z "$service" ]; then
        log_error "Please specify a service: frontend or backend"
        exit 1
    fi
    
    log_info "Opening shell in $service container..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME exec "$service" /bin/sh
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
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs backend"
    echo "  $0 shell frontend"
}

# Main script logic
check_docker
check_compose

case "${1:-help}" in
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
        show_logs "$2"
        ;;
    clean)
        clean_dev
        ;;
    rebuild)
        rebuild_dev
        ;;
    shell)
        shell_into "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac