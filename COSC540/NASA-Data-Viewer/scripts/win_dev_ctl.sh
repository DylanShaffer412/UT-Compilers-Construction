
#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="space-weather-dev"
CONTAINER_NAME="space-weather-dev-container"
DOCKERFILE_NAME="Dockerfile"
NETWORK_NAME="space-weather-net"
SECRETS_DIR=".secrets"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

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
        echo "ERROR: Docker is not running or not reachable."
        exit 1
    fi
}

ensure_not_in_container() {
    if [ -f "/.dockerenv" ]; then
        echo "ERROR: Run this script from your host terminal, not inside a container."
        exit 1
    fi
}

ensure_env_file() {
    if [ ! -f "${REPO_ROOT}/.env" ]; then
        echo "ERROR: .env file not found in repo root: ${REPO_ROOT}/.env"
        exit 1
    fi
}

ensure_secrets() {
    echo "==> Ensuring ${SECRETS_DIR}/ exists..."
    mkdir -p "${REPO_ROOT}/${SECRETS_DIR}"

    [ -f "${REPO_ROOT}/${SECRETS_DIR}/postgres_user.txt" ] || echo "spaceweather" > "${REPO_ROOT}/${SECRETS_DIR}/postgres_user.txt"
    [ -f "${REPO_ROOT}/${SECRETS_DIR}/postgres_password.txt" ] || echo "spaceweather" > "${REPO_ROOT}/${SECRETS_DIR}/postgres_password.txt"
    [ -f "${REPO_ROOT}/${SECRETS_DIR}/postgres_db.txt" ] || echo "spaceweather" > "${REPO_ROOT}/${SECRETS_DIR}/postgres_db.txt"
    [ -f "${REPO_ROOT}/${SECRETS_DIR}/pgadmin_password.txt" ] || echo "admin" > "${REPO_ROOT}/${SECRETS_DIR}/pgadmin_password.txt"
}

start_dev() {
    check_docker
    ensure_not_in_container
    ensure_env_file
    ensure_secrets

    echo "==> Starting database services..."
    docker compose -f "${REPO_ROOT}/docker-compose.yml" up -d postgres pgadmin

    echo "==> Building dev image..."
    docker build -t "${IMAGE_NAME}" -f "${REPO_ROOT}/${DOCKERFILE_NAME}" "${REPO_ROOT}"

    echo "==> Removing old dev container if it exists..."
    if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
        docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
    fi

    echo "==> Running dev container on network ${NETWORK_NAME}..."
    WIN_REPO_ROOT="$(cygpath -w "${REPO_ROOT}")"
    MSYS_NO_PATHCONV=1 docker run -it \
        --name "${CONTAINER_NAME}" \
        --network "${NETWORK_NAME}" \
        -v "${WIN_REPO_ROOT}:/workspace" \
        -w /workspace \
        --env-file "${WIN_REPO_ROOT}/.env" \
        -p 5173:5173 \
        -p 5000:5000 \
        -p 5200:5200 \
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
    docker compose -f "${REPO_ROOT}/docker-compose.yml" stop postgres pgadmin

    echo "==> Done."
}

restart_dev() {
    stop_dev
    start_dev
}

case "${COMMAND}" in
    start) start_dev ;;
    stop) stop_dev ;;
    restart) restart_dev ;;
    *) usage ;;
esac
