# Local Infrastructure — Velupi Cloud Platform

Entorno de desarrollo local con Docker Compose para PostgreSQL y Redis (BullMQ).

## Servicios incluidos
- **PostgreSQL 16**: Base de datos relacional para el Control Plane (`5432`).
- **Redis 7**: Motor de colas en memoria y caché para jobs asíncronos con BullMQ (`6379`).

## Comandos rápidos
```bash
# Iniciar servicios en segundo plano
docker compose up -d

# Ver estado y logs
docker compose ps
docker compose logs -f

# Detener servicios
docker compose down
```
