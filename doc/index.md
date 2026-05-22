# Documentación LDAP Admin+ - Metodología RUP

## Fases RUP

### 1. Concepción (Inception)
- **Objetivo:** Reemplazar el antiguo LDAP Admin PHP/CodeIgniter por una solución moderna, segura y fácil de instalar.
- **Alcance:** Sistema web para técnicos de soporte y administradores de red para gestionar directorios LDAP/Active Directory.
- **Stakeholders:** Técnicos de soporte, administradores de red.

### 2. Elaboración (Elaboration)
- **Análisis de requisitos:** `use_case_diagram.puml`
- **Modelo de datos:** `entity_relationship_diagram.puml`
- **Arquitectura:** `architecture_diagram.puml`
- **Flujos:** `activity_diagram.puml`
- **Secuencia:** `sequence_diagram.puml`

### 3. Construcción (Construction)
- Implementación de casos de uso por iteraciones
- Desarrollo backend (Django) y frontend (React)
- Pruebas unitarias y de integración

### 4. Transición (Transition)
- Despliegue en producción
- Capacitación a usuarios
- Documentación técnica

## Diagramas disponibles

| Diagrama | Código | Vista previa | Descripción |
|----------|--------|--------------|-------------|
| Casos de Uso | `use_case_diagram.puml` | `use_case_diagram.png` | Actores (Técnico/Admin) y 12 casos de uso |
| Entidad-Relación | `entity_relationship_diagram.puml` | `entity_relationship_diagram.png` | LDAPServer, User, Session, UserServerAccess |
| Secuencia | `sequence_diagram.puml` | `sequence_diagram.png` | Flujo crear usuario |
| Actividad | `activity_diagram.puml` | `activity_diagram.png` | Registro y conexión de servidor |
| Arquitectura | `architecture_diagram.puml` | `architecture_diagram.png` | Hexagonal + Proxy |

## Cómo usar los diagramas

### Ver imágenes PNG
Abre los `.png` directamente en cualquier visor de imágenes.

### Editar y exportar a VP
Los `.puml` son archivos de texto. Para convertirlos a formato Visual Paradigm:

1. **VS Code:** Instala extensión "PlantUML" → preview y export a SVG/PNG
2. **Online:** Copia el contenido en https://www.plantuml.com/plantuml/uml/
3. **Java:** `java -jar plantuml.jar diagrama.puml` (descarga plantuml.jar)
4. **VP Plugin:** Visual Paradigm 16.2 tiene soporte para importar PlantUML

### Regenerar imágenes PNG
```bash
pip install plantweb
python -m plantweb doc/*.puml --format png
```
