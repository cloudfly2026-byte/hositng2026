# CREDENCIALES Y CONFIGURACIÓN — WORDPRESS SUNCHI / VELUPI

**Fecha de instalación**: 15 de Octubre de 2026  
**Servidor**: HestiaCP VPS `89.117.147.134` (SSH puerto `10622`)  
**Ruta web**: `/home/velupi/web/velupi.com/public_html`  
**URL comercial**: `https://velupi.com/`  

---

## 1. Credenciales de Administrador de WordPress

- **URL de Acceso Admin**: [https://velupi.com/wp-admin/](https://velupi.com/wp-admin/)
- **Usuario Administrador**: `sunchi_miky31`
- **Correo Electrónico**: `admin@velupi.com`
- **Contraseña**: Administrada internamente vía WP-CLI / Hestia (para restablecer o actualizar: `wp user update sunchi_miky31 --user_pass="NUEVA_CLAVE" --allow-root`).

---

## 2. Base de Datos MariaDB / MySQL (HestiaCP)

- **Host**: `localhost` (puerto `3306`)
- **Nombre de Base de Datos**: `velupi_wp`
- **Usuario de Base de Datos**: `velupi_wpuser`
- **Charset**: `UTF8MB4`
- **Archivo de configuración**: `/home/velupi/web/velupi.com/public_html/wp-config.php`

---

## 3. Tema y Plugins Instalados y Activos

| Componente | Tipo | Versión | Estado | Propósito |
|---|---|---|---|---|
| **Sunchi Theme** (`sunchi-theme`) | Tema | `1.0.0` | **Activo** | Tema responsive con diseño oficial Sunchi (Hero 99/100, planes mensual/anual, FAQ acordeón). |
| **Sunchi Velupi Bridge** (`sunchi-velupi-bridge`) | Plugin | `1.0.0` | **Activo** | Conector Zero-Trust que enlaza la tienda con el carrito oficial `https://app.velupi.com/cart`. |
| **Wordfence Security** (`wordfence`) | Plugin | `9.0.2` | **Activo** | Firewall de aplicaciones web (WAF), escáner de malware y protección contra ataques de fuerza bruta. |
| **Yoast SEO** (`wordpress-seo`) | Plugin | `28.7` | **Activo** | Optimización en buscadores, meta tags OpenGraph, Schema.org y sitemaps XML automáticos. |
| **Polylang** (`polylang`) | Plugin | `3.8.11` | **Activo** | Gestión y selector multilingüe (Español `es_CO` / Inglés `en_US`). |

---

## 4. Estructura de Páginas y Navegación

- **Portada Estática**: `Inicio` (`/`) $\rightarrow$ Renderiza con `front-page.php`.
- **Planes y Precios**: `Planes y Precios` (`/precios/`) $\rightarrow$ Renderiza con `template-precios.php`.
- **Servicios Específicos**:
  - Web Hosting: `/hosting/` (`page-hosting.php`)
  - WordPress Hosting: `/wordpress/` (`page-wordpress.php`)
  - Cloud Apps: `/cloud-apps/` (`page-cloud-apps.php`)
  - Servidores VPS: `/vps/` (`page-vps.php`)
  - Contacto: `/contacto/` (`page-contacto.php`)
- **Menú Principal de Navegación**: Asignado a la ubicación `primary-menu` del tema.
- **Estructura de Enlaces Permanentes**: `/%postname%/` (URLs amigables).
