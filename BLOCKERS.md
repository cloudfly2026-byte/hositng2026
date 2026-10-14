# BLOCKERS.md — Matriz de Bloqueos, Dependencias y Necesidades

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de auditoría**: 13 de Octubre de 2026  
**Auditor**: Principal Software Architect & QA Lead  
**Documento de referencia**: `AGENTS.md` / `DEVELOPMENT_STATUS.md`  

---

## 1. Resumen de Bloqueos Críticos

| # | Bloqueo | Categoría | Impacto | Módulos Afectados | Acción Requerida para Desbloquear |
|---|---|---|---|---|---|
| **B-01** | Ausencia de Persistencia Relacional (ORM) | Código / Arquitectura | **Crítico** | Todo el sistema (Usuarios, Órdenes, DNS, Cuotas) | Implementar esquema Prisma/Drizzle con PostgreSQL y migraciones. |
| **B-02** | VPS `shared-node-01` sin Docker ni Dokploy | Infraestructura | **Alto** | Despliegue de Cloud Apps (Node/Python) | Ejecutar bootstrap de Docker + Dokploy en `169.58.220.244`. |
| **B-03** | Falta de Conector SSH2/API Real a HestiaCP | Infraestructura / Código | **Alto** | Aprovisionamiento WordPress, PHP, DNS | Configurar clave SSH privada o API Key en backend para `89.117.147.134`. |
| **B-04** | Punto Único de Fallo en DNS (`ns1/ns2`) | Infraestructura / Resiliencia | **Alto** | Disponibilidad de dominios de clientes | Aprovisionar un segundo VPS secundario para `ns2.velupi.com` con BIND9 esclavo. |
| **B-05** | Credenciales de Sandbox Wompi no inyectadas | Credenciales / Integraciones | **Medio** | Checkout y Cobros reales | Configurar llaves de pruebas en variables de entorno `.env`. |
| **B-06** | Delegación de `velupi.com` aún en `cloudfly.com.co` | DNS / Red | **Medio** | Lanzamiento comercial del dominio `velupi.com` | Crear zona `velupi.com` en BIND9 antes de cambiar los nameservers en GoDaddy. |

---

## 2. Detalle de Necesidades por Categoría

### 2.1 Accesos y Credenciales Requeridos
*(Nota: No incluir contraseñas en texto plano ni compartir secretos en chats o commits. Estas credenciales deben inyectarse exclusivamente en archivos `.env` locales o gestores de secretos en producción).*

1. **Par de llaves SSH para HestiaCP (`89.117.147.134`)**:
   - **Propósito**: Permitir que el backend de NestJS invoque comandos de HestiaCP (`v-add-user`, `v-add-web-domain`, `v-add-dns-domain`, etc.) de forma desatendida.
   - **Mecanismo**: Generar un par de llaves SSH (ej. `ed25519` o `rsa 4096`), añadir la clave pública al archivo `/root/.ssh/authorized_keys` del VPS `89.117.147.134` (o un usuario sudo restringido), e inyectar la clave privada en la variable `HESTIA_SSH_PRIVATE_KEY` del backend.
2. **API Key de Dokploy (`169.58.220.244`)**:
   - **Propósito**: Permitir que el backend invoque los endpoints de Dokploy para desplegar contenedores Docker.
   - **Mecanismo**: Generar token de API desde la interfaz administrativa de Dokploy tras su instalación e inyectar en `DOKPLOY_API_KEY`.
3. **Llaves de Sandbox de Wompi (Colombia)**:
   - **Propósito**: Probar el checkout, generación de firmas de integridad y recepción de webhooks firmados en el entorno de pruebas.
   - **Variables requeridas en `.env`**:
     - `WOMPI_PUBLIC_KEY`: Llave pública de pruebas (`pub_stag_...`).
     - `WOMPI_PRIVATE_KEY`: Llave privada de pruebas (`prv_stag_...`).
     - `WOMPI_EVENTS_SECRET`: Secreto para verificar la firma HMAC de los webhooks.
     - `WOMPI_INTEGRITY_SECRET`: Secreto para generar la firma de integridad del checkout.

---

### 2.2 Infraestructura Física y de Red Requerida

1. **Servidor Dokploy (`shared-node-01` — `169.58.220.244`)**:
   - **Estado actual**: Servidor Cloud VPS 4 MP activo en Hub Europa, pero limpio (sin Docker ni Dokploy).
   - **Requerimiento**:
     - Acceso SSH para ejecutar el script de instalación oficial de Dokploy.
     - Configuración de reglas de firewall (puertos 22, 80, 443, 3000).
2. **Servidor DNS Redundante (`ns2.velupi.com`)**:
   - **Estado actual**: En GoDaddy, `ns1.velupi.com` y `ns2.velupi.com` están configurados apuntando a la misma dirección IP (`89.117.147.134`).
   - **Riesgo**: Si el servidor `89.117.147.134` se reinicia o pierde conectividad, toda la resolución DNS de `velupi.com` y de los clientes que usen esos nameservers se detendrá por completo.
   - **Requerimiento**: Disponer de un segundo VPS económico en otra ubicación geográfica o proveedor para actuar como servidor esclavo secundario de BIND9.
3. **Zona BIND9 para `velupi.com` en HestiaCP**:
   - **Estado actual**: En GoDaddy, el dominio `velupi.com` aún tiene asignados los nameservers antiguos `ns1.cloudfly.com.co` y `ns2.cloudfly.com.co`.
   - **Requerimiento**: Antes de cambiar la delegación a `ns1.velupi.com` y `ns2.velupi.com`, se debe crear la zona autoritativa `velupi.com` en HestiaCP con sus registros A, MX y glue records para evitar que el dominio quede inaccesible durante la propagación.

---

### 2.3 Decisiones Técnicas y de Negocio Pendientes

1. **Selección del ORM para PostgreSQL**:
   - **Opción A (Recomendada)**: **Prisma ORM**.
     - *Pros*: Tipado fuerte autogenerado, migraciones automáticas declarativas, excelente integración con NestJS, interfaz gráfica Prisma Studio.
     - *Contras*: Mayor consumo de memoria por el motor de consulta en Rust.
   - **Opción B**: **Drizzle ORM**.
     - *Pros*: Máximo rendimiento, ligero, control SQL explícito.
     - *Contras*: Menor nivel de abstracción para relaciones complejas.
   - *Decisión requerida del usuario*: Confirmar adopción de **Prisma ORM**.

2. **Wildcard DNS para aplicaciones de staging**:
   - Confirmar si se creará el registro comodín `*.apps.velupi.com IN A 169.58.220.244` en la zona DNS para que cada aplicación desplegada en Dokploy obtenga automáticamente una URL temporal (ej. `mi-app-staging.apps.velupi.com`).

3. **Mecanismo de Autenticación de Usuarios**:
   - Confirmar si se utilizará autenticación propia con **JWT + Argon2 + Refresh Tokens** en NestJS, o un proveedor externo como **Clerk / Auth0 / Supabase Auth**.
   - *Recomendación del arquitecto*: Autenticación propia en NestJS (JWT + Argon2) para mantener el control total de los datos y evitar dependencias de terceros en el MVP.

---

## 3. Plan de Desbloqueo y Responsabilidades

| Bloqueo | Responsable | Próxima Acción Inmediata | Plazo Estimado |
|---|---|---|---|
| **B-01 (ORM / Persistencia)** | Agente de IA / Dev | Crear esquema Prisma y migraciones para entidades de dominio | 1 día |
| **B-02 (Dokploy Setup)** | Usuario / DevOps | Ejecutar `curl -sSL https://dokploy.com/setup.sh \| sh` en `169.58.220.244` | 30 minutos |
| **B-03 (SSH HestiaCP)** | Usuario / DevOps | Configurar clave pública SSH en `89.117.147.134` e inyectar clave privada en `.env` | 15 minutos |
| **B-04 (DNS Redundante)** | Usuario / DevOps | Decidir si se aprovisiona un segundo VPS o se mantiene temporalmente un solo nodo | Decisión comercial |
| **B-05 (Wompi Sandbox)** | Usuario | Suministrar credenciales de prueba de Wompi Colombia para `.env` | 15 minutos |
| **B-06 (Zona DNS velupi.com)** | Agente de IA + Usuario | Implementar módulo DNS y crear la zona autoritativa en HestiaCP | 1 día |
