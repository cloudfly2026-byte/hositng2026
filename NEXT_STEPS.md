# NEXT_STEPS.md — Plan Técnico Priorizado y Hoja de Ruta

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 15 de Octubre de 2026  
**Metodología**: TDD Obligatorio (Red → Green → Refactor)  
**Documento rector**: `AGENTS.md`  
**Estado acumulado**: Fases 1 a 8 completadas, Persistencia Relacional `IUnitOfWork` inyectada en NestJS, Cliente HTTP API tipado y conectado al frontend — 32 suites de prueba, 213 pruebas aprobadas (100% GREEN).

---

## 1. Visión general del estado y siguientes hitos

Habiendo completado la especificación de dominio y controladores API para las Fases 1 a 8, el cableado de `IUnitOfWork` en `AppModule` y la integración del cliente de API real en el frontend (`apps/web`), los siguientes sprints se concentran en infraestructura y entorno en vivo:

```text
[Fases 1 a 8: Dominio, API Controllers, TDD] ✅ COMPLETADO
                         │
                         ▼
[Persistencia Relacional IUnitOfWork en NestJS] ✅ COMPLETADO
                         │
                         ▼
[Conexión Frontend Real (apps/web ApiClient)] ✅ COMPLETADO
                         │
                         ▼
[Sprint Infraestructura: Bootstrap Dokploy/Traefik VPS & BIND9 velupi.com]
                         │
                         ▼
[Sprint Final MVP: Wompi Live Sandbox & Hermes Read-Only Gateway]
```

---

## 2. Estado de los Sprints Recientes

### Sprint: Persistencia Relacional en NestJS API (`apps/api`) — ✅ COMPLETADO
- `IUnitOfWork` implementado y conectado en `packages/domain` (`OrderService`, `ProvisioningOrchestrator`, `AuthenticationService`).
- Inyectado como provider en `apps/api/src/app.module.ts` respaldado por `@cloudfly/persistence` (`PrismaUnitOfWork`).
- Pruebas unitarias de persistencia relacional añadidas y verificadas (100% GREEN).

### Sprint: Conexión Real Frontend (`apps/web` → `apps/api`) — ✅ COMPLETADO
- `ApiClient` implementado en `apps/web/src/modules/api-client.ts` con soporte JWT Bearer y suite de pruebas (`api-client.spec.ts`).
- `/checkout` conectado para crear órdenes y sesiones de Wompi reales contra el Control Plane.
- `/billing` conectado para listar suscripciones e facturas reales con botón de actualización en vivo.

---

## 3. Sprint Siguiente: Infraestructura, Dokploy, Traefik y BIND9

### Tarea 3.1: Habilitar Puertos y Bootstrap de Dokploy en VPS `169.58.220.244`
- **Prioridad**: CRÍTICA.
- **Acción**:
  - Configurar UFW para abrir puertos 80 (HTTP) y 443 (HTTPS) para Traefik, y puerto 3000 para Dokploy.
  - Ejecutar script de instalación oficial de Dokploy: `curl -sSL https://dokploy.com/setup.sh | sh`.
  - Generar API Key de Dokploy e inyectar en `DOKPLOY_API_KEY` en el archivo de entorno del VPS.

### Tarea 3.2: Creación de Zona Autoritativa `velupi.com` en BIND9 (`89.117.147.134`)
- **Prioridad**: CRÍTICA.
- **Acción**:
  - Crear la zona DNS `velupi.com` en HestiaCP/BIND9 con registros:
    - `A @ 89.117.147.134` (Sitio comercial)
    - `CNAME www velupi.com.`
    - `A api 169.58.220.244` (API Control Plane)
    - `A app 169.58.220.244` (Portal de Clientes)
    - `NS ns1.velupi.com.` y `ns2.velupi.com.`
  - Validar resolución local con `Resolve-DnsName -Name velupi.com -Server 89.117.147.134`.
  - Solo tras verificar la respuesta local, proceder con la delegación en GoDaddy.

---

## 4. Resumen de Pruebas y Cobertura TDD

| Paquete / App | Suites | Pruebas | Estado |
|---|---|---|---|
| `@cloudfly/contracts` | - | Tipos TypeScript | COMPILADO 100% |
| `@cloudfly/domain` | 13 | 96 | 100% GREEN |
| `@cloudfly/persistence` | 1 | 8 | 100% GREEN |
| `@cloudfly/deployment-adapters` | 3 | 13 | 100% GREEN |
| `apps/api` | 12 | 81 | 100% GREEN |
| `apps/web` | 3 | 15 | 100% GREEN |
| **TOTAL** | **32** | **213** | **100% GREEN** |

