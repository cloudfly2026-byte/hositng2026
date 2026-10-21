# INFRASTRUCTURE_RUNBOOK.md — Guía Operativa de Infraestructura, DNS y Despliegue Seguro

> **Velupi Cloud Platform** — Documento técnico de operaciones para DevOps, administradores de sistemas y agentes IA.  
> **Fecha de emisión**: 15 de Octubre de 2026  
> **Estado**: Listo para ejecución controlada. No ejecutar pasos marcados como [REQUIERE AUTORIZACIÓN] sin confirmación del usuario.

---

## 1. Arquitectura de Nodos y Topología de Red

| Componente | Host / IP | Puertos Abiertos | Rol Operativo | Nivel de Exposición |
|---|---|---|---|---|
| **Control Plane & Apps** (`shared-node-01`) | `169.58.220.244` | 22 (SSH), 4000 (API), 3001 (Web) | Docker Engine 29.9.0, NestJS API, Next.js Web, PostgreSQL 16, Redis 7 | Temporalmente puertos 4000 y 3001 públicos para pruebas; migrarán detrás de Traefik (443) |
| **Hosting Tradicional & DNS** (`hestia-node-01`) | `89.117.147.134` | 10622 (SSH), 53 (BIND9 DNS), 80 (HTTP), 443 (HTTPS), 8083 (Hestia Admin API) | PHP 8.2/8.3, MariaDB 10.11, BIND9 DNS, Exim4 Mail | Servidor web PHP y DNS autoritativo (Admin: `manager`) |
| **DNS Autoritativo Primario** | `ns1.velupi.com` (`89.117.147.134`) | 53 (UDP/TCP) | Servidor de nombres autoritativo primario | Público |
| **DNS Autoritativo Secundario** | `ns2.velupi.com` (`89.117.147.134`) | 53 (UDP/TCP) | Servidor de nombres autoritativo secundario | Público |

---

## 2. Configuración Autoritativa de BIND9 y Hosting para `velupi.com`

### 2.1 Diagnóstico Real por SSH / Hestia CLI (15 de Octubre de 2026)
- **Conectividad SSH**: Operativa en puerto `10622` (`root / [REDACTED_PASSWORD]`).
- **Estado de Cuentas**:
  - Usuario administrador de Hestia: `manager`.
  - Usuarios existentes: `manager`, `cloudfly`, `ebmmetrology`, `hospita2`, `inmaculada`, `nueveluna`, `prenem`, `protor`, `pulguero`.
  - **No existe usuario `velupi`** en el sistema.
- **Estado de Dominios Web**:
  - Existen 13 dominios configurados (ej. `cloudfly.com.co`, `clinicalainmaculada.org`, etc.).
  - **`velupi.com` NO existe como dominio web**. Las peticiones HTTP caen en el vhost fallback por defecto de Nginx.
- **Estado de Zonas DNS en BIND9**:
  - Existen 13 zonas DNS configuradas.
  - **`velupi.com` NO existe en BIND9** (por eso devuelve `RCODE_REFUSED`).
- Resolución pública retorna **`RCODE_SERVER_FAILURE`** debido a falta de respuesta autoritativa.

### 2.2 Archivo de Zona BIND9 Preparado (`/etc/bind/zones/velupi.com.db`)
```bind
$TTL 14400
@    IN    SOA    ns1.velupi.com. hostmaster.velupi.com. (
                  2026101501 ; Serial YYYYMMDDNN
                  7200       ; Refresh (2 horas)
                  3600       ; Retry (1 hora)
                  1209600    ; Expire (2 semanas)
                  3600 )     ; Minimum TTL (1 hora)

; Servidores de Nombres Autoritativos
@                  IN    NS       ns1.velupi.com.
@                  IN    NS       ns2.velupi.com.

; Glue Records (IP del host de BIND9)
ns1                IN    A        89.117.147.134
ns2                IN    A        89.117.147.134

; Sitio Comercial Web (HestiaCP)
@                  IN    A        89.117.147.134
www                IN    CNAME    velupi.com.

; Aplicaciones Cloud y Control Plane (VPS Docker 169.58.220.244)
app                IN    A        169.58.220.244
api                IN    A        169.58.220.244
status             IN    A        169.58.220.244
docs               IN    A        169.58.220.244
*.apps             IN    A        169.58.220.244

; Correo Electrónico
mail               IN    A        89.117.147.134
@                  IN    MX 10    mail.velupi.com.
@                  IN    TXT      "v=spf1 a mx ip4:89.117.147.134 ~all"
_dmarc             IN    TXT      "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@velupi.com"

; Certificados SSL Let's Encrypt CAA
@                  IN    CAA 0    issue "letsencrypt.org"
```

### 2.3 Procedimiento de Ejecución [REQUIERE AUTORIZACIÓN]
1. En el servidor `89.117.147.134` (vía HestiaCP CLI o API):
   ```bash
   v-add-dns-domain admin velupi.com 89.117.147.134 ns1.velupi.com ns2.velupi.com
   v-add-dns-record admin velupi.com app A 169.58.220.244
   v-add-dns-record admin velupi.com api A 169.58.220.244
   v-add-dns-record admin velupi.com status A 169.58.220.244
   v-add-dns-record admin velupi.com docs A 169.58.220.244
   v-add-dns-record admin velupi.com *.apps A 169.58.220.244
   ```
2. Validar sintaxis antes de reiniciar BIND9:
   ```bash
   named-checkzone velupi.com /etc/bind/zones/velupi.com.db
   rndc reload velupi.com
   ```
3. Probar respuesta autoritativa:
   ```powershell
   Resolve-DnsName -Name app.velupi.com -Server 89.117.147.134
   ```
4. Solo tras recibir respuesta `169.58.220.244`, actualizar los Nameservers en GoDaddy hacia:
   - `ns1.velupi.com` (`89.117.147.134`)
   - `ns2.velupi.com` (`89.117.147.134`)

---

## 3. Plan de Despliegue Dokploy + Traefik en VPS `169.58.220.244`

### 3.1 Verificación de Conflictos de Puerto
- Puerto 80: **Cerrado** (Libre para Traefik HTTP).
- Puerto 443: **Cerrado** (Libre para Traefik HTTPS).
- Puerto 3000: **Cerrado** (Libre para Dokploy UI).
- Puertos en uso actual: 4000 (`velupi-api`), 3001 (`velupi-web`), 5432 (Postgres local en 127.0.0.1), 6379 (Redis local en 127.0.0.1).
- **Conclusión**: **0 conflictos de puertos detectados**.

### 3.2 Script de Bootstrap de Dokploy [REQUIERE AUTORIZACIÓN]
```bash
# Ejecutar en VPS 169.58.220.244 como root:
curl -sSL https://dokploy.com/setup.sh | sh
```
El script instala automáticamente:
- Dokploy Dashboard en puerto `3000`.
- Traefik Reverse Proxy escuchando en puertos `80` y `443`.
- Red Docker compartida `dokploy-network`.

### 3.3 Configuración de Reverse Proxy para Velupi (`app.velupi.com` y `api.velupi.com`)
Se incorporan etiquetas Traefik en `docker-compose.prod.yml`:

```yaml
services:
  api:
    image: ${API_IMAGE}
    container_name: velupi-api
    networks:
      - default
      - dokploy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.velupi-api.rule=Host(`api.velupi.com`)"
      - "traefik.http.routers.velupi-api.entrypoints=websecure"
      - "traefik.http.routers.velupi-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.velupi-api.loadbalancer.server.port=4000"

  web:
    image: ${WEB_IMAGE}
    container_name: velupi-web
    networks:
      - default
      - dokploy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.velupi-web.rule=Host(`app.velupi.com`)"
      - "traefik.http.routers.velupi-web.entrypoints=websecure"
      - "traefik.http.routers.velupi-web.tls.certresolver=letsencrypt"
      - "traefik.http.services.velupi-web.loadbalancer.server.port=3000"

networks:
  dokploy-network:
    external: true
```

### 3.4 Cierre de Puertos Públicos Directos (Endurecimiento de Firewall)
Una vez verificado el acceso HTTPS a través de Traefik:
1. En `docker-compose.prod.yml`, cambiar:
   - `4000:4000` → `127.0.0.1:4000:4000`
   - `3001:3000` → `127.0.0.1:3001:3000`
2. Configuración UFW en el VPS:
   ```bash
   ufw default deny incoming
   ufw default allow outgoing
   ufw allow 22/tcp      # SSH
   ufw allow 80/tcp      # HTTP Traefik (redirect a HTTPS)
   ufw allow 443/tcp     # HTTPS Traefik
   ufw enable
   ```

---

## 4. Estado de los Endpoints y Limitaciones Auditadas

| Endpoint / Módulo | Estado Auditado | Limitación Actual |
|---|---|---|
| `POST /auth/register` & `POST /auth/login` | **100% Persistente en PostgreSQL** | Operativo con hash Argon2id y recuperación tras reinicio. |
| `GET /billing/subscriptions` | **100% Persistente** | Basado en PostgreSQL y máquina de estados. |
| `POST /checkout/order` | **100% Persistente** | Cálculo autoritativo de precios e impuestos. |
| `POST /webhooks/wompi` | **Staged con Sandbox** | Valida firma HMAC SHA-256. Pendiente credenciales reales de Wompi. |
| `GET /hosting/sites` | **Solo Lectura Seguro** | Conectado a HestiaCP en modo solo lectura (`HESTIA_READ_ONLY=true`). Mutaciones bloqueadas intencionalmente. |
| `GET /dns/zones` | **Lógica Completa** | Valida RFC 1912 y multi-tenancy. Reconciliación lista a la espera de crear zona BIND9. |
| `GET /apps` & `POST /apps/:id/restart` | **Staged en DokployAdapter** | Conectado a adapter tipado. Esperando bootstrap de Dokploy en el host. |

---

## 5. Plan de Respaldo, Verificación y Recuperación (Disaster Recovery)

### 5.1 Procedimiento de Respaldo Previo a Intervención
Antes de instalar Dokploy o modificar BIND9:
```bash
# 1. Respaldo de Base de Datos PostgreSQL
docker exec velupi-postgres pg_dump -U velupi_user velupi_production > /opt/velupi/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Respaldo de Archivos de Configuración
tar -czvf /opt/velupi/backups/config_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/velupi/docker-compose.prod.yml /opt/velupi/.env

# 3. Respaldo de BIND9 (en Hestia VPS)
tar -czvf /root/bind_backup_$(date +%Y%m%d_%H%M%S).tar.gz /etc/bind/ /usr/local/hestia/data/
```

### 5.2 Verificación de Estado (Health Check)
Tras cualquier intervención, ejecutar la siguiente batería:
```bash
# 1. Verificar estado del API
curl -f -s http://127.0.0.1:4000/health || exit 1

# 2. Verificar estado del Frontend
curl -f -s -I http://127.0.0.1:3001 | grep "200 OK" || exit 1

# 3. Verificar resolución DNS
dig @89.117.147.134 app.velupi.com +short
```

### 5.3 Procedimiento de Rollback Inmediato
- **Si falla Dokploy/Traefik**:
  ```bash
  docker compose -f /etc/dokploy/docker-compose.yml down
  # Restaurar puertos directos en /opt/velupi/docker-compose.prod.yml
  docker compose -f /opt/velupi/docker-compose.prod.yml up -d
  ```
- **Si falla la zona BIND9**:
  ```bash
  rm -f /etc/bind/zones/velupi.com.db
  rndc reload
  ```
- **Si se corrompe la base de datos PostgreSQL**:
  ```bash
  docker exec -i velupi-postgres psql -U velupi_user -d velupi_production < /opt/velupi/backups/latest_backup.sql
  ```
