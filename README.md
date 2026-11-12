# QuadCommit Proposals

Motor compartido de propuestas comerciales y técnicas de QuadCommit. Un solo sitio, un JSON por propuesta.

## Propuestas publicadas

| Propuesta | URL | PDF |
|---|---|---|
| Ing. Scarling · Voucherlize | `https://quadcommit.github.io/proposals/?p=scarling` | `pdf/scarling.pdf` |

La raíz del sitio (`/proposals/`) carga `scarling` por defecto. Cada propuesta se selecciona con `?p=<slug>`.

## Estructura

```text
index.html                 Shell del documento
assets/                    CSS, JS y logos compartidos
sections/                  Partials HTML del motor
data/
  scarling.json            Contenido de la propuesta de Ing. Scarling
pdf/
  scarling.pdf             PDF descargable
scripts/
  generate-pdf.mjs         Exportación con Playwright
```

El motor lee `?p=<slug>`, descarga `data/<slug>.json` y renderiza las secciones compartidas. Cambiar el diseño en `assets/` o `sections/` afecta a todas las propuestas; cambiar un JSON solo afecta a esa propuesta.

## Agregar una propuesta

1. Copia `data/scarling.json` a `data/<slug>.json`.
2. Ajusta `meta`, contenido, precios y las rutas `hero.pdf.href` / `contact.pdf.href`.
3. Genera el PDF con `npm run pdf -- <slug>` (o coloca el archivo manualmente en `pdf/`).
4. Haz commit y push a `main`.
5. Publica la URL `https://quadcommit.github.io/proposals/?p=<slug>`.

El `slug` solo admite minúsculas, números y guiones (`^[a-z0-9][a-z0-9-]*$`).

## Vista local

El sitio usa `fetch` para cargar JSON y partials, así que necesita un servidor HTTP. Desde la raíz del repositorio:

```powershell
python -m http.server 8080
```

Abre `http://localhost:8080/?p=scarling`. No abras `index.html` con `file://`.

## Generar el PDF

Primera vez:

```powershell
npm install
```

Exportar:

```powershell
npm run pdf
# o una propuesta específica
npm run pdf -- otro-cliente
```

El script usa Microsoft Edge por defecto (`channel: msedge`) y cae a Chrome o Chromium si no está disponible. Para forzar un canal:

```powershell
$env:PLAYWRIGHT_CHANNEL = "chrome"; npm run pdf
```

La exportación aplica `assets/css/print.css`, oculta la navegación y las acciones interactivas, y usa una portada a página completa. El resultado queda en `pdf/<slug>.pdf`.

## Publicación

GitHub Pages sirve la rama `main` desde la raíz del repositorio. No hay build. `.nojekyll` evita el procesamiento de Jekyll.

## Confidencialidad

Este repositorio es público porque GitHub Pages en el plan Free requiere un repositorio público. La página incluye:

- `meta robots` con `noindex, nofollow, noarchive, nosnippet`.
- `robots.txt` con `Disallow: /`.

Estas medidas reducen la indexación por buscadores, pero **no hacen privado el sitio**. Cualquier persona con la URL puede leer el HTML, los JSON y los PDF. No publiques aquí información que no pueda ser pública. Si una propuesta debe ser privada, hay que usar un hosting con control de acceso (por ejemplo Cloudflare Access) y un repositorio privado.
