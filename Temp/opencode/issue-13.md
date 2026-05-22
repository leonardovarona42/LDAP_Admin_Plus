## Descripcion
Dos problemas de velocidad que impactan la experiencia de usuario:

### 1. DashboardMetrics hace stats secuenciales (C2)
`DashboardMetrics.get()` itera servidores y por cada uno llama `connect()` + `get_user_stats()` (busqueda paginada completa). Con 3 servidores, cada request del dashboard hace 3 busquedas LDAP secuenciales. Sin paralelismo y sin cache adecuado.

### 2. _paged_search sin limite maximo (A3)
`_paged_search()` en `adapter.py` tiene un loop `while True` sin limite de paginas. Si el AD devuelve cookies incorrectas, el loop nunca termina, consumiendo CPU y conexiones.

## Soluciones
1. Ejecutar stats de servidores en paralelo con `ThreadPoolExecutor`
2. Cachear DashboardMetrics 60s en vez de 30s
3. Anadir `max_pages=100` a `_paged_search` para evitar loops infinitos
