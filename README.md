# Songbird Academy 🐦

Un "Duolingo de cantos de aves": lecciones cortas tipo quiz para aprender a identificar
aves del **Valle del Cauca y Cauca (Colombia)** por su canto. Los audios provienen de
[xeno-canto](https://xeno-canto.org).

- Aplicación web 100 % estática: sin backend, sin base de datos y sin cuentas.
- Interfaz en español e inglés, con diseño mobile-first.
- Repetición espaciada (Leitner, 5 cajas), XP y racha diaria. Todo se guarda en `localStorage`.

**Stack:** Vite + TypeScript sin framework, y Vitest para los tests. En producción no hay
dependencias en tiempo de ejecución.

---

## Requisitos

- Node.js **20.12 o superior** (se usa `process.loadEnvFile` para leer `.env`).
- Una API key de Xeno-canto. **Solo hace falta para regenerar el catálogo**, no para
  compilar ni desplegar la app.

```bash
npm install
```

## 1. Generar el catálogo de audios

El script `scripts/build-catalog.mjs` lee `data/species.json`, consulta la API v3 de
Xeno-canto y escribe `public/data/catalog.json`.

1. Consigue tu API key en <https://xeno-canto.org/account>. Necesitas una cuenta con el
   correo verificado.
2. Crea tu archivo `.env`. Ya está en `.gitignore`, así que no se sube al repo:

   ```bash
   cp .env.example .env
   ```

   Luego edita `.env` y pon `XENO_CANTO_API_KEY=tu_key`.
3. Ejecuta el script:

   ```bash
   npm run catalog
   ```

Qué hace el script:

- Para cada especie busca grabaciones con `q:">C" len:"<60"`, primero dentro del recuadro
  del Valle del Cauca y Cauca (`box:0.9,-78.0,5.1,-75.6`). Si encuentra menos de 3, amplía
  la búsqueda a `cnt:colombia`, y si aún no alcanza, a todas las grabaciones de la especie.
- Selecciona de 3 a 5 grabaciones por especie. Prioriza la región, luego el formato MP3
  sobre WAV (los WAV pesan más en el celular), luego la calidad A sobre la B, y garantiza
  variedad de tipos (song y call). Descarta las grabaciones `uncertain` y solo usa
  sonidos que no sean cantos ni llamados (alas, tamborileo…) si no hay suficientes.
- Hace las peticiones una a la vez, con una pausa entre ellas, y reintenta ante errores
  temporales.
- Al final imprime un reporte con las grabaciones por especie. Las especies con menos de
  3 grabaciones **se excluyen** y se listan como advertencia.

El `catalog.json` generado **sí se versiona**, de modo que el build y el despliegue no
necesitan la key. La app reproduce los audios directamente desde Xeno-canto; no se
descargan MP3.

> **Para editar especies:** modifica `data/species.json` (`id`, `scientificName`,
> `nameEs`, `nameEn` y `family`) y vuelve a ejecutar `npm run catalog`. El campo `family`
> sirve para elegir distractores parecidos. El campo opcional `altNames` permite probar
> sinónimos taxonómicos cuando Xeno-canto usa otro nombre (por ejemplo, *Amazilis tzacatl*).

## 2. Correr la app en local

```bash
npm run dev
```

Abre <http://localhost:5173>. Para probar el build de producción:

```bash
npm run build
```

```bash
npm run preview
```

## 3. Tests

```bash
npm test
```

Los tests cubren la lógica central:

- `tests/lesson.test.ts`: selección de preguntas y mezcla de especies nuevas y de repaso.
- `tests/distractors.test.ts`: distractores únicos y de la misma familia.
- `tests/leitner.test.ts`: repetición espaciada.
- `tests/streak.test.ts`: rachas, incluido el cambio de día, de mes y de año, y el horario de verano.
- `tests/progress.test.ts`: XP, persistencia y respaldo en memoria si `localStorage` falla.
- `tests/i18n.test.ts`: detección de idioma y que ambos idiomas tengan las mismas claves.
- `tests/catalog-utils.test.ts`: reglas del pipeline de catálogo.

Para verificar que ninguna API key quedó en el repo ni en `dist/`:

```bash
npm run check:secrets
```

## 4. Despliegue

El build usa rutas relativas (`base: './'`) y navegación por hash (`#/lesson`). Por eso el
mismo `dist/` funciona en la raíz de un dominio o en un subdirectorio, sin cambios de
código ni reglas de redirección. Si algún hosting necesita una ruta absoluta, puedes
definir `BASE_PATH=/mi-ruta/` al compilar.

### GitHub Pages

1. Sube el repo a GitHub con la rama `main`.
2. En **Settings → Pages → Build and deployment**, elige **Source: GitHub Actions**.
3. Haz push a `main`. El workflow `.github/workflows/deploy.yml` instala dependencias,
   corre los tests, compila, verifica que no haya secretos y publica `dist/`.
4. La app quedará en `https://<usuario>.github.io/<repo>/`.

### Netlify

1. En Netlify elige **Add new site → Import an existing project** y conecta el repo.
2. Netlify lee `netlify.toml`, así que no hay que configurar nada: el comando de build es
   `npm run build` y la carpeta publicada es `dist`.
3. Pulsa **Deploy**.

También puedes desplegar sin conectar el repo:

```bash
npm run build
```

Después arrastra la carpeta `dist/` a <https://app.netlify.com/drop>.

### Vercel y Cloudflare Pages

Importa el repo y elige el preset **Vite**, con el comando de build `npm run build` y la
carpeta de salida `dist`. No hace falta nada más.

> No configures `XENO_CANTO_API_KEY` en ningún servicio de hosting: el build no la usa.

## Estructura

```
data/species.json          Lista fuente de especies
scripts/build-catalog.mjs  Pipeline de catálogo (usa la API key)
scripts/check-secrets.mjs  Verificación de que la key no está en el repo ni en el bundle
public/data/catalog.json   Catálogo generado (versionado)
src/core/                  Lógica pura: lecciones, distractores, Leitner, rachas, XP
src/state/                 localStorage seguro y modelo de progreso
src/i18n/                  es.json, en.json y utilidades de traducción
src/ui/                    Pantallas (inicio, lección, resumen, progreso, acerca de) y componentes
tests/                     Tests unitarios (Vitest)
```

## Cómo funciona el juego

- **Lección:** 10 preguntas. Cada una tiene un botón "Escuchar" (sin autoplay) y 4
  opciones. Se puede escuchar el canto todas las veces que se quiera. También se puede
  responder con las teclas 1 a 4.
- **Distractores:** primero especies de la misma familia; si no alcanzan, especies al
  azar. Nunca se repiten opciones.
- **Repetición espaciada:** cada especie está en una caja del 1 al 5. Un acierto la sube
  una caja y un error la devuelve a la 1. La caja *n* se repasa cada 1, 2, 4, 8 o 16
  lecciones. Cada lección incluye los repasos vencidos y hasta 4 especies nuevas.
- **XP:** 10 por acierto, más 20 de bonus por una lección perfecta.
- **Racha:** días consecutivos (en la hora local) en los que se completó al menos una
  lección.
- **Audio que no carga:** se muestra un mensaje y se puede saltar la pregunta sin
  penalización.

## Licencias y créditos

Las grabaciones pertenecen a sus autores y se comparten en xeno-canto bajo licencias
Creative Commons. La app muestra, después de cada pregunta, el grabador, la licencia (con
enlace) y el enlace a la grabación original. Muchas licencias son *no comerciales* (NC):
tenlo en cuenta antes de cualquier uso comercial.
