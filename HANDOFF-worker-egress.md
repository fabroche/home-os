# Tarea: arreglar el sync del worker "home-os" (error "Premature close" hacia Notion)

## Contexto
En este VPS (Hostinger + Dokploy, Docker Swarm) corre un proyecto Dokploy llamado **home-os**.
Tiene un servicio **worker** (imagen `node:22-alpine`, arranca con `npx tsx worker/index.ts`)
que cada 15 min sincroniza datos desde la API de Notion (`https://api.notion.com`) hacia una
instancia de Supabase self-host (también en este VPS, dominio `homeos-supabase.genzai.cloud`).

El worker arranca bien pero la llamada a Notion falla SIEMPRE con:

```
[worker] sync ERROR: Invalid response body while trying to fetch
https://api.notion.com/v1/databases/<id>/query: Premature close
```

Tarda ~20 s en fallar (porque ya reintenta 5 veces con backoff), o sea es **determinista**, no transitorio.

## Lo que YA se probó (sin éxito)
- Reintentos ante errores de red (premature close, ECONNRESET, etc.) en el código → reintenta pero todos fallan.
- `page_size=50` en las queries (respuestas más pequeñas).
- `NODE_OPTIONS=--dns-result-order=ipv4first` en el env del worker.
- Dato importante: **desde fuera del VPS (otra máquina) el mismo sync funciona perfecto**, así que el
  problema es el **egress del contenedor/VPS**, no el código ni el token.

## Diagnóstico a ejecutar (y reportar resultados)
```bash
# 1) ID/nombre del contenedor del worker
docker ps | grep home-os

# 2) Egress a Notion DESDE EL CONTENEDOR, respuesta diminuta (debería devolver un 401 JSON corto)
docker exec <ID_WORKER> sh -c "wget -S -qO- https://api.notion.com/v1/users/me 2>&1 | head -20"

# 3) Egress del contenedor a OTRO host (descarta que sea solo Notion)
docker exec <ID_WORKER> sh -c "wget -qO- https://api.github.com 2>&1 | head -c 120; echo"

# 4) La misma llamada a Notion pero DESDE EL HOST
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://api.notion.com/v1/users/me

# 5) MTU del host y de la red de Dokploy
ip link show
docker network inspect dokploy-network | grep -i mtu
ping -M do -s 1472 -c 2 1.1.1.1   # 1500 bytes; si falla, prueba -s 1400, -s 1300...
```

## Árbol de decisión
- **#2 falla pero #4 (host) funciona** → es la **red Docker (MTU)**. Aplica el fix MTU (abajo).
- **#2 falla y #3 (github) también** → egress general del contenedor roto (firewall/NAT). Revisar reglas de salida.
- **#2 falla pero #3 (github) va** → específico de **Notion/Cloudflare** (probable bug de undici/TLS con keep-alive). Solución de código (abajo).
- **#2 funciona (devuelve el 401)** → es **tamaño**: bajar `page_size` a 10 (código).

## Fix MTU (si aplica)
Editar `/etc/docker/daemon.json` añadiendo (sin borrar lo existente):
```json
{ "mtu": 1400 }
```
`sudo systemctl restart docker` → ⚠️ reinicia TODOS los contenedores del VPS (avisar al usuario primero,
hay otros proyectos). Si la overlay `dokploy-network` mantiene el MTU viejo, puede requerir recrearla con
`--opt com.docker.network.driver.mtu=1400` (delicado: afecta a todos los proyectos). Tras el cambio,
redeploy del worker en Dokploy y comprobar logs.

## Fixes de CÓDIGO (si el problema es Notion/Cloudflare o tamaño)
El código vive en el repo privado **github.com/fabroche/home-os** (rama `main`), desplegado por Dokploy
desde `worker.Dockerfile`. Para cambios de código: clonar el repo, editar, commit, push, y redeploy en Dokploy.
- **Tamaño**: en `src/lib/notion/databases.ts`, bajar el `pageSize` por defecto de 50 a 10.
- **undici/Cloudflare**: en `src/lib/notion/client.ts`, pasar un `fetch` propio al cliente Notion
  (`new Client({ auth, fetch: customFetch })`) usando un `undici.Agent` con `pipelining: 0` y keep-alive
  desactivado, o la librería `node-fetch`. (Coordinar este cambio con el usuario si hay dudas.)

## Definición de "resuelto"
En los logs runtime del worker (Dokploy → Logs) debe verse:
```
[worker] iniciando · sync finanzas con cron "*/15 * * * *"
[worker] sync OK · 80 movimientos · 8 deudas · <ms>
```

## Restricciones
- No romper los otros proyectos del VPS ni su Supabase. Avisar antes de reiniciar Docker.
- No exponer secretos en claro. El token de Notion y las claves Supabase están en el env del servicio worker.
