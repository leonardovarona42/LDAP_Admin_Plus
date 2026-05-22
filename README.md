# LDAP Admin+

Sistema moderno de administración LDAP / Active Directory de código abierto.  
Construido con **Django** + **React (Vite)** sobre **Arquitectura Hexagonal** con **Patrón Proxy** para gestión eficiente de conexiones LDAP, diseñado para la administración diaria de directorios activos en entornos empresariales.

---

## Propósito

LDAP Admin+ es una herramienta de gestión gráfica para directorios LDAP y Active Directory que resuelve las necesidades del día a día de los administradores de redes y sistemas:

- **Administración multi-dominio** — gestiona múltiples servidores LDAP/AD desde una única interfaz unificada
- **Operaciones CRUD completas** — creación, modificación, deshabilitación y eliminación de usuarios, grupos y unidades organizativas
- **Autenticación delegada** — los usuarios del sistema pueden autenticarse directamente contra su dominio LDAP/AD
- **Mapeo automático de roles** — asigna roles del sistema basados en la pertenencia a grupos LDAP
- **Solicitudes de altas y bajas** — flujo de trabajo para que operadores soliciten altas/bajas y administradores las ejecuten
- **Auditoría completa** — registro detallado de todas las operaciones realizadas sobre el directorio
- **Exportación de datos** — exportación de reportes en múltiples formatos

---

## Funcionalidades

### Gestión de servidores LDAP/AD
- Registro y configuración de múltiples servidores LDAP/AD simultáneos
- Soporte para LDAP (puerto 389) y LDAPS (puerto 636) por servidor
- Prueba de conexión con verificación de estado
- Atributos mapeables por servidor para adaptarse a diferentes esquemas de directorio
- Health-check y monitoreo de estado en tiempo real

### Administración de usuarios
- Listado con búsqueda y filtrado avanzado (nombre, usuario, correo, OU)
- Creación de usuarios con todos los atributos estándar LDAP/AD
- Edición de atributos (nombre, correo, teléfono, cargo, etc.)
- Habilitar / deshabilitar cuentas
- Cambio de contraseñas
- Vista detallada de pertenencia a grupos
- Exportación de listados

### Administración de grupos
- Listado y búsqueda de grupos por nombre o DN
- Creación y eliminación de grupos
- Vista de miembros y grupos anidados

### Unidades organizativas (OU)
- Exploración jerárquica del árbol LDAP
- Navegación por estructura de directorio
- Creación de nuevas OUs

### Autenticación y seguridad
- **Modos de autenticación**: solo base de datos, solo LDAP, o mixto (DB + LDAP)
- Plantilla configurable de bind DN para autenticación LDAP con placeholder `{username}`
- **Mapeo de grupos LDAP a roles del sistema**: asigna automáticamente roles según el grupo LDAP/AD del usuario al iniciar sesión
- Prioridad configurable por mapeo

### Solicitudes de altas y bajas (Workflow)
- Operadores pueden crear solicitudes de alta/baja de usuarios
- Tablero con métricas (totales, pendientes, ejecutadas)
- Administradores ejecutan o rechazan solicitudes desde la misma interfaz
- Filtro por estado y tipo

### Autenticación y autorización
- Sistema de roles con permisos granulares
- Roles por defecto configurables
- Superusuario con permisos totales

### Seguridad
- Proxy de conexión LDAP con patrón de diseño Proxy para control y aislamiento
- Conexiones SSL/TLS por servidor
- Auditoría completa de todas las operaciones
- Protección CSRF en API

### Panel de monitoreo (Dashboard)
- Resumen visual del estado de todos los servidores registrados
- Conteo de usuarios (totales, habilitados, deshabilitados) por servidor
- Estado online/offline en tiempo real
- Estadísticas de actividad reciente

---

## Arquitectura Hexagonal (Ports & Adapters)

El proyecto sigue el patrón de **Arquitectura Hexagonal** (también conocida como Puertos y Adaptadores), que separa claramente la lógica de negocio del núcleo de la aplicación de los detalles de infraestructura.

```
┌──────────────────────────────────────────────────────────────────┐
│                     INTERFACES (Driving Side)                     │
│                                                                   │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐  │
│  │   React + Vite      │──►│   REST API (Django REST Framework)│  │
│  │   (SPA / Web UI)    │   │   /api/*                         │  │
│  └─────────────────────┘   └──────────────┬───────────────────┘  │
│                                            │                      │
│  ┌─────────────────────┐                   │                      │
│  │   Django Admin      │───────────────────┘                      │
│  └─────────────────────┘                                          │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │   DOMINIO   │
                    │  (Núcleo)   │
                    │             │
                    │  Entidades  │
                    │  Puertos    │── LDAPConnector (interfaz)
                    │  Casos Uso  │── Repository (interfaz)
                    │             │
                    └──────┬──────┘
                           │
┌──────────────────────────┴───────────────────────────────────────┐
│                     INFRAESTRUCTURA (Driven Side)                  │
│                                                                   │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐  │
│  │  Repositorio        │   │  LDAPConnectorAdapter            │  │
│  │  (SQLite/PostgreSQL)│   │  (Implementa el puerto LDAP)     │  │
│  └─────────────────────┘   └──────────────┬───────────────────┘  │
│                                            │                      │
│                                    ┌───────┴────────┐            │
│                                    │  CONNECTION     │            │
│                                    │   PROXY        │            │
│                                    │  (Patrón Proxy)│            │
│                                    │                │            │
│                                    │  • Pool de     │            │
│                                    │    conexiones  │            │
│                                    │  • LDAP/LDAPS  │            │
│                                    │  • Auto-bind   │            │
│                                    │  • Health-check│            │
│                                    └───────┬────────┘            │
│                                            │                      │
│                          LDAP / LDAPS / Active Directory          │
└──────────────────────────────────────────────────────────────────┘
```

### Capas

1. **Dominio** (núcleo) — Contiene las entidades de negocio (`LDAPUser`, `LDAPGroup`, `OrganizationalUnit`), los puertos (interfaces como `LDAPConnector` y `LDAPRepository`), y los casos de uso. Esta capa no tiene dependencias de infraestructura.

2. **Interfaces** (driving side) — Contiene los controladores REST (Django REST Framework) que traducen peticiones HTTP a llamadas a casos de uso, y el frontend React que consume la API.

3. **Infraestructura** (driven side) — Implementa los puertos definidos en dominio: el adaptador LDAP (`LDAPConnectorAdapter`), el repositorio de persistencia (modelos Django ORM), y el **ConnectionProxy** que encapsula la conexión LDAP real.

### Patrón Proxy

El **ConnectionProxy** es una implementación del patrón de diseño Proxy que actúa como intermediario entre el adaptador LDAP y las conexiones reales al directorio:

- **Control de acceso**: centraliza la autenticación y autorización sobre la conexión LDAP
- **Lazy initialization**: la conexión TCP/TLS se establece solo cuando es necesaria
- **Pooling**: reutilización de conexiones para reducir el overhead de handshake TLS y bind
- **Aislamiento**: encapsula la librería `ldap3` y expone una interfaz limpia al dominio
- **Health-check**: verificación de estado de la conexión antes de cada operación

```
Solicitud ──► LDAPConnectorAdapter ──► ConnectionProxy ──► ldap3.Connection ──► LDAP/AD
                   (adaptador)              (proxy)           (real)
```

---

## Stack Tecnológico

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Python     | 3.13+   | Lenguaje base |
| Django     | 5.x     | Framework web |
| Django REST Framework | 3.x | API REST |
| ldap3      | 2.x     | Cliente LDAP nativo Python |
| SQLite     | -       | Base de datos desarrollo |
| PostgreSQL | 16+     | Base de datos producción |

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React      | 18+     | Framework UI |
| Vite       | 8.x     | Build tool / dev server |
| React Router | 6+   | Enrutamiento SPA |
| Axios      | 1.x     | Cliente HTTP |

### Infraestructura
| Componente | Propósito |
|------------|-----------|
| Docker + Compose | Contenerización y orquestación |
| Gunicorn | Servidor WSGI producción |
| Nginx (proxy) | Reverse proxy producción |

---

## Requisitos

- **Python** 3.13+
- **Node.js** 18+
- **npm** 9+
- **Docker** (opcional, para ejecución contenerizada)

---

## Instalación y Ejecución

### Desarrollo (sin Docker)

#### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

El servidor backend arranca en `http://localhost:8000`.

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

El servidor frontend arranca en `http://localhost:5173` con recarga en caliente.

### Producción (Docker)

```bash
docker-compose up --build
```

Ambos servicios arrancan contenerizados. El frontend se sirve desde el backend en `http://localhost:8000`.

### Crear superusuario

```bash
cd backend
python manage.py createsuperuser
```

---

## API Endpoints

### Servidores LDAP
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/servers/` | Listar servidores registrados |
| POST | `/api/servers/` | Registrar nuevo servidor |
| GET | `/api/servers/{id}/` | Detalle del servidor |
| PUT | `/api/servers/{id}/` | Actualizar servidor |
| DELETE | `/api/servers/{id}/` | Eliminar servidor |
| POST | `/api/servers/test-connection/` | Probar conexión (datos en body) |
| POST | `/api/servers/{id}/connect/` | Conectar al servidor |
| POST | `/api/servers/{id}/disconnect/` | Desconectar del servidor |

### Usuarios LDAP
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/servers/{id}/users/` | Listar usuarios (con filtros) |
| POST | `/api/servers/{id}/users/` | Crear usuario |
| GET | `/api/servers/{id}/users/{dn}/` | Detalle del usuario |
| PUT | `/api/servers/{id}/users/{dn}/` | Actualizar usuario |
| DELETE | `/api/servers/{id}/users/{dn}/` | Eliminar usuario |
| POST | `/api/servers/{id}/users/{dn}/enable/` | Habilitar usuario |
| POST | `/api/servers/{id}/users/{dn}/disable/` | Deshabilitar usuario |
| POST | `/api/servers/{id}/users/{dn}/reset-password/` | Resetear contraseña |

### Grupos LDAP
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/servers/{id}/groups/` | Listar grupos |
| POST | `/api/servers/{id}/groups/` | Crear grupo |
| DELETE | `/api/servers/{id}/groups/{dn}/` | Eliminar grupo |

### Unidades Organizativas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/servers/{id}/ous/` | Listar OU |
| POST | `/api/servers/{id}/ous/` | Crear OU |

### Equipos (Computadoras)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/servers/{id}/computers/` | Listar equipos |

### Estadísticas por servidor
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/servers/{id}/stats/` | Estadísticas del servidor |

### Autenticación y Configuración
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Iniciar sesión |
| POST | `/api/auth/logout/` | Cerrar sesión |
| GET | `/api/auth/user/` | Obtener usuario actual |
| GET | `/api/auth/config/` | Obtener configuración de autenticación |
| PUT | `/api/auth/config/` | Actualizar configuración de autenticación |

### Roles del Sistema
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/system/roles/` | Listar roles |
| POST | `/api/system/roles/` | Crear rol |
| PUT | `/api/system/roles/{id}/` | Actualizar rol |
| DELETE | `/api/system/roles/{id}/` | Eliminar rol |
| GET | `/api/system/permissions/` | Listar permisos disponibles |

### Mapeo LDAP → Roles
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ldap-role-mappings/` | Listar mapeos |
| POST | `/api/ldap-role-mappings/` | Crear mapeo |
| DELETE | `/api/ldap-role-mappings/{id}/` | Eliminar mapeo |

### Solicitudes (Altas/Bajas)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/solicitudes/` | Listar solicitudes |
| POST | `/api/solicitudes/` | Crear solicitud |
| POST | `/api/solicitudes/{id}/` | Ejecutar o rechazar solicitud |

### Auditoría
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/audit-logs/` | Listar registros de auditoría |

### Dashboard
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/metrics/` | Métricas del dashboard |

---

## Licencia

[MIT](LICENSE)
