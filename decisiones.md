# Decisiones — Ingeniería del Software 3 (UCC 2026)

Repositorio del semestre. Cada trabajo práctico agrega su sección debajo, sin borrar las anteriores:
el historial es uno solo y es lo que se defiende en el Integrador.

---

## TP1 — Git colaborativo

### Sobre qué repositorio se hizo el TP

Este repositorio ya contenía la aplicación que voy a usar como app del semestre — **Sistema de
Reservas**, un desarrollo propio en Next.js 16 sobre PostgreSQL. En vez de crear un repositorio
vacío para el TP1 y migrar después, monté las protecciones y el flujo de Pull Requests sobre este
mismo, que es lo que la materia pide: un único repositorio para todo el semestre, donde cada TP es
una capa más sobre el mismo artefacto.

Consecuencia práctica: el código de la app que tenía commiteado en local **entró a `main` por Pull
Request**, no por push directo. Así el historial de `origin` arranca mostrando el flujo funcionando
en vez de un volcado de commits.

La justificación de la elección de la app contra los cinco criterios de `elegir-app.md` va en la
sección del TP2, que es donde el enunciado la pide.

### Por qué Git no pudo resolver el conflicto solo

Git integra dos ramas comparando cada una contra su **ancestro común** — el commit donde se
separaron. Si un archivo cambió en una sola de las dos ramas, Git sabe cuál es el cambio y lo aplica
sin preguntar nada. El problema aparece cuando **las dos ramas modifican la misma región del mismo
archivo** partiendo del mismo estado original: ahí Git tiene dos versiones distintas del mismo
fragmento y ninguna regla para preferir una sobre la otra. Elegir sería inventar la intención del
autor, y Git no adivina intención. Por eso frena, escribe las dos versiones dentro del archivo
separadas por los marcadores `<<<<<<<`, `=======` y `>>>>>>>`, y deja la decisión en manos de una
persona.

En mi caso las ramas `feature/titulo-a` y `feature/titulo-b` nacieron **las dos de `main`** y
tocaron la misma línea del `README.md`. Al mergear A, `main` avanzó; cuando B intentó entrar, su
ancestro común con `main` seguía siendo el commit viejo y esa línea ya no coincidía con lo que B
esperaba encontrar.

Vale la pena aclarar qué **no** es un conflicto: que dos personas toquen el mismo archivo no alcanza.
Git integra sin problema cambios en zonas distintas del mismo archivo. Lo que rompe es la
superposición de regiones.

**Qué habría tenido que pasar para que nunca apareciera.** Que las dos ramas no tocaran la misma
región del mismo archivo — sea porque el trabajo estaba repartido de otra manera, sea porque B se
hubiera sincronizado con `main` (un `git pull --rebase` o un merge de `main` hacia la rama) **antes**
de que esa línea divergiera. Esto último no elimina los conflictos: los **adelanta**. En vez de
aparecer todos juntos y grandes en el momento de mergear el PR, los resolvés en tu propia rama,
temprano y de a poco. Es exactamente la razón por la que se recomienda integrar seguido y mantener
las ramas cortas: el conflicto es proporcional al tiempo que las ramas estuvieron separadas.

### Problemas encontrados y cómo los solucioné

- **La app estaba entera en local y sin subir, y las protecciones ya estaban puestas.** Tenía 17
  commits en `main` local que nunca había pusheado, y en `origin` solo estaba el commit inicial. Con
  *Do not allow bypassing* activo, el `git push` a `main` ya no era una opción — que es justamente el
  punto de la regla. Lo resolví como corresponde: creé `feature/app-inicial` apuntando al mismo
  commit donde estaba parado (`git switch -c` no mueve nada, solo agrega un nombre), pusheé la rama
  —las ramas no están protegidas, solo `main`— y la integré por Pull Request. Al mergear elegí
  **Create a merge commit** y no *Squash and merge*, para no aplastar en un commit el historial de
  milestones de la construcción de la app.

- **Un `.git/index.lock` huérfano dejó el repositorio bloqueado.** Cualquier comando de git me
  contestaba `Unable to create '.git/index.lock': File exists`, sugiriendo que había otro proceso de
  git corriendo. No había ninguno: una herramienta externa que estaba inspeccionando el repositorio
  creó el lock y no pudo borrarlo al terminar, y quedó el archivo huérfano. Git usa ese archivo como
  semáforo para que dos procesos no escriban el índice al mismo tiempo; si el archivo queda sin
  dueño, git asume lo peor y frena. Se resuelve borrando el `.git/index.lock` a mano. Aprendizaje:
  el mensaje de error de git describe la causa *probable*, no la única.

- **Fines de línea: `git diff` mostraba archivos enteros modificados sin que yo los tocara.**
  Después de editar el `README.md` desde la web de GitHub, git me marcaba las 261 líneas del archivo
  como cambiadas. No era contenido: era CRLF contra LF. GitHub guarda con LF y Windows escribe CRLF,
  así que para git cada línea es distinta aunque el texto sea idéntico. Lo resolví descartando esos
  cambios locales y configurando `core.autocrlf` para que la conversión sea automática y no vuelva a
  ensuciar los diffs.

### Declaración de uso de IA

Usé **Claude (Cowork)** en este TP para:

1. **Leer y resumir el repositorio de la cátedra** — el reglamento, `elegir-app.md` y los enunciados
   de los TP1 a TP3 — y para contrastar mis proyectos previos contra los cinco criterios de
   selección de la app del semestre.
2. **Redactar el borrador de este archivo y de `evidencias.md`**, y ordenar la secuencia de pasos
   del TP adaptada al estado real de mi repositorio (que ya tenía la app y commits sin pushear).

**Cómo lo verifiqué:**

- La explicación de por qué Git no puede resolver el conflicto solo la contrasté contra lo que
  efectivamente pasó en mi repositorio: miré los marcadores reales en el editor de GitHub y verifiqué
  con `git log --graph` que `feature/titulo-a` y `feature/titulo-b` salían del mismo commit de `main`.
- Las protecciones no las di por buenas porque estuvieran configuradas: las verifiqué con la prueba
  de fuego del enunciado — intenté pushear directo a `main` y confirmé que GitHub me rechazó a mí,
  que soy el dueño del repositorio. Ésa es la captura 1 de `evidencias.md`.
- Los tres problemas de la sección anterior los diagnostiqué y los resolví ejecutando yo los
  comandos; la explicación de cada causa la contrasté con el comportamiento real del repositorio.
- Cada paso lo ejecuté yo, en mi máquina y en la web de GitHub. La IA no tuvo acceso a mi cuenta de
  GitHub en ningún momento.

**Lo que no fue asistido por IA:** la configuración de las protecciones de rama, la creación y merge
de los Pull Requests, la resolución del conflicto, el tag y la release, y las capturas de evidencia.

---

## TP2 — Contenedores

### Qué app elegí y por qué

**Sistema de Reservas**, desarrollo propio: gestión de reservas para restaurantes. Next.js 16 (App
Router) sobre PostgreSQL 17 con Drizzle ORM. Contra los cinco criterios de `elegir-app.md`, en el
orden de importancia que fija el documento:

1. **Corre hoy.** Es la app que vengo desarrollando; la levanto en local sin sorpresas y ahora
   también con `docker compose up -d` en una máquina limpia.
2. **Sé cómo se compila y se ejecuta.** `pnpm build` (que invoca `next build`) y `node server.js`
   sobre la salida `standalone`. Eso es exactamente lo que expresa el Dockerfile.
3. **La conexión a la base está centralizada y es parametrizable.** Una sola variable,
   `DATABASE_URL`, leída en `src/db/client.ts`; si falta, el proceso falla al arrancar con un
   mensaje claro en vez de romper más tarde de forma rara. No hay ninguna cadena de conexión escrita
   en el código. Es lo que permite que la misma imagen apunte a la base del contenedor hoy y a una
   base de QA y otra de producción en el TP6, sin recompilar nada.
4. **Tiene reglas de negocio para testear, y ya testeadas.** Máquina de estados de la reserva
   (`pending → confirmed → seated → completed`, con transiciones prohibidas explícitas), motor de
   disponibilidad, restricción anti doble-booking a nivel base con un `EXCLUDE` constraint, buffer
   entre sentadas, turnos que cruzan medianoche, ventana de anticipación, tope de tamaño de grupo y
   validaciones de entrada con Zod. Hoy hay ~40 tests en `tests/`, muy por encima de los 8 de
   backend que pide el TP5.
5. **La entiendo lo suficiente para modificarla en vivo**, que es lo que se pide en la mesa del
   Integrador: la escribí yo, y el historial muestra su construcción por milestones.

Sobre el **tamaño**, que el documento pide chico: la app es más grande que las 2–3 pantallas
sugeridas. La decisión fue no cambiar de app —los criterios 3 y 4, que son los que más cuestan
recuperar, están resueltos— sino **reducir la superficie que entra al sistema de entrega**: el
módulo de facturación con Mercado Pago queda inactivo (sus variables vacías, y el cliente de MP se
construye recién al usarse, así que la app arranca y funciona sin ellas) y el worker de pg-boss
queda fuera del compose. Así el pipeline no arrastra una dependencia de un servicio de terceros ni
un proceso extra que mantener vivo en cada environment. Es la recomendación literal de la guía sobre
APIs de terceros: si el servicio cambia sus condiciones a mitad de semestre, el TP queda
comprometido.

### Decisiones de contenerización

**Un solo Dockerfile, no dos.** El enunciado pide un Dockerfile para el backend y otro para el
frontend. Mi app es un monolito: el App Router de Next sirve las páginas y las rutas de
`src/app/api/**` son la API, y las dos cosas compilan al mismo artefacto. Separarlas sería inventar
un borde que el framework no tiene, y me obligaría a mantener dos builds de un mismo proyecto. La
tecnología es libre según `elegir-app.md`, y ese documento dice que los ajustes que pide el stack
propio son parte del trabajo y se documentan acá. Consecuencia buena: de acá en adelante el pipeline
construye una imagen, despliega una imagen y prueba un contenedor.

**Multi-stage, cuatro etapas.** `deps` instala las dependencias (incluidas las de desarrollo, que
hacen falta para compilar) y se cachea mientras no cambien `package.json` ni el lockfile — por eso
esos dos archivos se copian antes que el código. `builder` compila con `output: "standalone"`, que
deja en `.next/standalone` un `server.js` con solo las dependencias efectivamente trazadas.
`runner` es la imagen que se publica: parte de `node:22-alpine` limpia y recibe únicamente el
servidor compilado, los estáticos y `public`. No lleva pnpm, ni devDependencies, ni código fuente.
`migrator` es la cuarta etapa, y va aparte por una razón concreta: aplicar migraciones necesita el
toolchain (`tsx`, el migrador de Drizzle y los archivos `.sql`) que justamente sacamos de la imagen
final. Meterlo en el runner habría anulado media ventaja del multi-stage.

**Imágenes base.** `node:22-alpine` para todas las etapas de la app: Node 22 porque es lo que pide
Next 16, y Alpine porque baja el tamaño final de forma importante. Se agrega `libc6-compat` porque
Alpine usa musl y algunos binarios nativos esperan glibc. `postgres:17-alpine` para la base, la
misma versión mayor que uso en desarrollo, para no descubrir diferencias de motor recién en
producción.

**Seguridad mínima de la imagen.** El runner corre como un usuario sin privilegios (`nextjs`,
uid 1001) en vez de root. Si alguien se escapa del proceso, no arranca siendo administrador del
contenedor.

**`CMD` y no `ENTRYPOINT`.** `CMD` define el comando por defecto y se puede reemplazar desde
`docker run` o desde compose sin pelear con `--entrypoint`; es lo que uso para correr el seed sobre
la imagen de migraciones.

**Qué persiste y qué no.** Solo la base persiste, en un volumen administrado por Docker
(`db_data`), montado en `/var/lib/postgresql/data`. Todo lo demás es descartable a propósito: los
contenedores de app y de migraciones no guardan estado, así que se pueden matar y recrear sin
perder nada — que es la condición para poder desplegarlos en el TP6. Por eso `docker compose down`
conserva los datos y `docker compose down -v` los borra: la `-v` es la que se lleva el volumen.

**`depends_on` con `healthcheck`, y por qué no alcanza `depends_on` solo.** `depends_on` a secas
espera a que el contenedor *arranque*, no a que el servicio de adentro esté *listo*. Postgres tarda
unos segundos más en aceptar conexiones, así que sin el healthcheck la app arrancaba contra una base
que todavía no escuchaba. Con `condition: service_healthy` la app espera al `pg_isready`. Y las
migraciones usan `condition: service_completed_successfully`: la app no arranca hasta que el
esquema esté aplicado.

**El host de la base cambia según dónde corra la app.** En el `.env` la `DATABASE_URL` apunta a
`localhost`, que es lo correcto para `pnpm dev`. Adentro de la red de compose el host es `db` —el
nombre del servicio, que la red resuelve sola, sin IPs— y por eso el `docker-compose.yml` pisa esa
variable a propósito. Es la misma imagen apuntando a bases distintas según el entorno, que es
exactamente lo que el TP6 va a necesitar.

**Secretos.** El `.env` no se commitea (`.gitignore`), y el `.dockerignore` lo excluye del contexto
de build para que no termine dentro de una capa de la imagen. Lo que sí se versiona es
`.env.example`, que documenta qué variables existen sin ningún valor real. Por eso el arranque son
dos comandos y no uno.

### Problemas encontrados y cómo los solucioné

<!-- Completar mientras construís y probás las imágenes: qué falló, por qué, cómo lo resolviste. -->

- **...**

### Declaración de uso de IA

<!-- Completar. Base de lo que corresponde declarar: -->

Usé **Claude (Cowork)** para redactar el `Dockerfile`, el `.dockerignore`, los dos archivos de
compose, el `.env.example`, la sección de arranque del `README.md` y el borrador de esta sección,
a partir de una lectura del código de la app y del enunciado del TP.

**Cómo lo verifiqué:** construí las imágenes y levanté el sistema en una máquina limpia siguiendo mi
propio README; comprobé el healthcheck y el flujo end-to-end; verifiqué la persistencia con
`down` / `up` y el borrado con `down -v`; comparé el tamaño de la imagen final contra la de build; y
probé la variante `docker-compose.registry.yml` bajando las imágenes del registry. Todo eso está en
`evidencias.md`.
