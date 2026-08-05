#!/usr/bin/env bash
set -euo pipefail

source .env

IMAGE_NAME="space-weather-dev"
CONTAINER_NAME="space-weather-dev-container"
DOCKERFILE_NAME="Dockerfile"
NETWORK_NAME="space-weather-net"
SECRETS_DIR=".secrets"

usage() {
    echo "Usage: $0 {start|stop|restart}"
    exit 1
}

if [ $# -ne 1 ]; then
    usage
fi

COMMAND="$1"

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "ERROR: Docker is not running."
        exit 1
    fi
}

ensure_env_file() {
    if [ ! -f ".env" ]; then
        echo "ERROR: .env file not found in repo root."
        exit 1
    fi
}

ensure_secrets() {
    echo "==> Ensuring ${SECRETS_DIR}/ exists..."
    mkdir -p "${SECRETS_DIR}"

    if [ ! -f "${SECRETS_DIR}/postgres_user.txt" ]; then
        echo "spaceweather" > "${SECRETS_DIR}/postgres_user.txt"
        echo "Created ${SECRETS_DIR}/postgres_user.txt"
    fi

    if [ ! -f "${SECRETS_DIR}/postgres_password.txt" ]; then
        echo "spaceweather" > "${SECRETS_DIR}/postgres_password.txt"
        echo "Created ${SECRETS_DIR}/postgres_password.txt"
    fi

    if [ ! -f "${SECRETS_DIR}/postgres_db.txt" ]; then
        echo "spaceweather" > "${SECRETS_DIR}/postgres_db.txt"
        echo "Created ${SECRETS_DIR}/postgres_db.txt"
    fi

    if [ ! -f "${SECRETS_DIR}/pgadmin_password.txt" ]; then
        echo "admin" > "${SECRETS_DIR}/pgadmin_password.txt"
        echo "Created ${SECRETS_DIR}/pgadmin_password.txt"
    fi
}

start_dev() {
    check_docker
    ensure_env_file
    ensure_secrets

    echo "==> Starting database services..."
    docker compose up -d postgres pgadmin

    echo "==> Building dev image..."
    docker build -t "${IMAGE_NAME}" -f "${DOCKERFILE_NAME}" .

    echo "==> Removing old dev container if it exists..."
    if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
        docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
    fi

    echo "==> Running dev container on network ${NETWORK_NAME}..."
    docker run -it --rm \
        --name "${CONTAINER_NAME}" \
        --network "${NETWORK_NAME}" \
        -v "$(pwd):/workspace" \
        -w /workspace \
        --env-file .env \
        -e CHOKIDAR_USEPOLLING=true \
        -e WATCHPACK_POLLING=true \
        -p 5173:5173 \
        -p 5000:5000 \
        -p 5001:5001 \
        -p 8081:8081 \
        -p 8000:8000 \
        "${IMAGE_NAME}" \
        bash
}

stop_dev() {
    check_docker

    echo "==> Stopping dev container..."
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

    echo "==> Stopping database services..."
    docker compose stop postgres pgadmin

    echo "==> Done."
}

restart_dev() {
    stop_dev
    start_dev
}

case "${COMMAND}" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    *)
        usage
        ;;
esac