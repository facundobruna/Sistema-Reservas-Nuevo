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

- **El build de la imagen fallaba con `DATABASE_URL no está definida`, y la solución correcta era
  cambiar la app, no el Dockerfile.** El primer `docker compose build` reventaba en `pnpm build`,
  en la fase *Collecting page data*, con el error de la variable de entorno faltante. La causa:
  `next build` importa cada `route.ts` para recolectar su configuración, esas rutas importan
  `src/db/client.ts`, y ese módulo validaba `DATABASE_URL` **en el cuerpo del módulo** — es decir,
  al importarse. Adentro de la imagen no hay `.env` porque el `.dockerignore` lo excluye a
  propósito, así que la variable no existía y el módulo tiraba antes de que se compilara nada. En mi
  máquina nunca lo había visto porque el `.env` está siempre ahí.

  Había tres salidas y dos son malas: meter el `.env` en el contexto de build (mete un secreto en
  una capa de la imagen, inaceptable) o pasar una `DATABASE_URL` falsa como `ARG` de build (esconde
  el problema y deja una cadena de conexión inventada dando vueltas en el Dockerfile). La correcta
  es la tercera: **que el cliente de base se construya cuando se usa y no cuando se importa.**
  Reescribí `src/db/client.ts` con inicialización perezosa —la validación pasó adentro de una
  función, igual que ya lo hacía `src/lib/auth/signed-token.ts` con `AUTH_SECRET`— y exporté un
  `Proxy` para no tener que tocar los ~40 lugares que ya usan `db`.

  El aprendizaje es más grande que Docker: **compilar y ejecutar son momentos distintos**, y hasta
  ahora mi app exigía una base de datos disponible para poder *compilar*. Eso no es una limitación
  del contenedor, es un acoplamiento que tenía el código y que el contenedor puso en evidencia. Es
  el mismo argumento que justifica el multi-stage.

- **El `COPY` de `public/` falló porque git no versiona directorios vacíos.** Con el build ya
  arreglado, la etapa `runner` cortaba en `COPY --from=builder /app/public: not found`. La carpeta
  `public/` de Next existía en mi máquina pero estaba vacía, y git no versiona directorios vacíos:
  nunca estuvo en el repositorio, así que un `git stash -u` se la llevó y no volvió. La agregué con
  un `.gitkeep` adentro para que quede versionada y llegue al contexto de build. La alternativa era
  borrar esa línea del Dockerfile, pero entonces el día que agregue un asset estático a `public` la
  imagen lo ignoraría en silencio, que es peor que fallar.

- **El contenedor de migraciones salía a internet al arrancar, y por eso fallaba.** Con las
  imágenes ya construidas, `migrate` moría con exit 1 después de 30 segundos. El log mostró la causa:
  el `CMD` era `pnpm db:migrate`, y pnpm, antes de correr un script, hace un chequeo de estado de
  dependencias que dispara un `install` implícito. El contenedor se bajaba pnpm con corepack, salía
  a la red a revalidar las 830 entradas del lockfile (17,8 s) y terminaba abortando con
  `ERR_PNPM_IGNORED_BUILDS` por los scripts de build de `esbuild` y `sharp`, que en un contenedor de
  producción están deshabilitados por seguridad.

  Lo cambié por `CMD ["node_modules/.bin/tsx", "src/db/migrate.ts"]`: el binario ya está adentro de
  la imagen, así que se lo invoca directo. El principio general es el que importa: **un contenedor
  no puede depender de la red para arrancar.** Si necesita descargar algo cada vez que se levanta,
  deja de ser un artefacto inmutable y reproducible — falla cuando el registry de npm está lento,
  cuando el runner del pipeline no tiene salida a internet, o cuando una dependencia cambia entre
  dos arranques de la misma imagen. Todo lo que hace falta para ejecutar tiene que quedar resuelto
  en tiempo de build.

- **El healthcheck marcaba la app como caída aunque funcionaba perfecto.** `docker compose up
  --wait` terminaba con `container sistema-reservas-app-1 is unhealthy`, pero
  `http://localhost:3000/api/v1/health` respondía `{"status":"ok","database":"up"}` sin problema. El
  chequeo era `wget --no-verbose --tries=1 --spider ...`, y `node:22-alpine` trae el `wget` de
  BusyBox, que no acepta esas opciones (son del wget de GNU). Curl directamente no está en la
  imagen. El comando fallaba siempre, sin importar el estado real de la app.

  Lo reemplacé por un chequeo con el propio node, que sí está garantizado en la imagen:
  `node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r => process.exit(r.ok ? 0 : 1))..."`.
  Node 22 trae `fetch` global, así que el healthcheck deja de depender de qué binarios incluya la
  imagen base — una dependencia oculta y frágil, sobre todo con imágenes mínimas como Alpine.

  Lo importante de este error es la clase de error que es: **un healthcheck mal escrito no rompe la
  aplicación, rompe la percepción que el orquestador tiene de ella.** El contenedor corre bien pero
  el sistema lo cree caído. En el TP6 eso significa un despliegue marcado como fallido y,
  potencialmente, un rollback automático de una versión que funcionaba.

### Declaración de uso de IA

Usé **Claude (Cowork)** para redactar el `Dockerfile`, el `.dockerignore`, los dos archivos de
compose, el `.env.example`, la sección de arranque del `README.md` y el borrador de esta sección,
a partir de una lectura del código de la app y del enunciado del TP.

**Cómo lo verifiqué:** construí las imágenes y levanté el sistema en una máquina limpia siguiendo mi
propio README; comprobé el healthcheck y el flujo end-to-end; verifiqué la persistencia con
`down` / `up` y el borrado con `down -v`; comparé el tamaño de la imagen final contra la de build; y
probé la variante `docker-compose.registry.yml` bajando las imágenes del registry. Todo eso está en
`evidencias.md`.

---

## TP3 — Planificación y trazabilidad

### Duración del sprint: 1 semana

La elegí para que **espeje el calendario real de la materia**: se dicta una clase por semana y se
entrega un TP por clase, así que el borde del sprint cae exactamente donde el trabajo se evalúa de
verdad. Un sprint que termina el martes cuando la entrega es el martes convierte la ceremonia en
algo útil en vez de decorativo.

Las otras dos razones son propias del contexto:

- **Trabajo solo y con horas limitadas.** Una semana es el horizonte más largo que puedo planificar
  sin que el plan quede viejo. A dos o tres semanas, la mitad de lo que planifiqué el primer día ya
  no refleja lo que sé el décimo.
- **Los errores de planificación aparecen antes.** Si me sobrecomprometo, me entero en una semana y
  no en tres. Con sprints largos el error se descubre cuando ya es tarde para corregirlo.

El costo que acepto: más ceremonia por unidad de trabajo entregado. Con sprints de una semana,
planificar y revisar pesa proporcionalmente más que con sprints de dos. Lo asumo porque en un
trabajo individual esa ceremonia son diez minutos, no una reunión de equipo.

### Límite de trabajo en progreso: 2

La regla de arranque es **cantidad de personas más uno**. Trabajando solo, eso da 2.

El «más uno» no es relleno: es la **válvula** para cuando algo queda esperando por fuera de mí —una
revisión, una respuesta, un build corriendo— y necesito avanzar en otra cosa sin abandonar lo
primero. Sin ese margen, cualquier bloqueo me frena del todo; con demasiado margen, el límite deja
de limitar y vuelvo a tener todo empezado y nada terminado.

Detrás hay una idea, no un número: **empezar menos para terminar más**. El trabajo empezado y sin
terminar no es productividad, es inventario — y el inventario cuesta: más cambio de contexto, más
ramas viejas, más conflictos al integrar. El límite hace visible ese costo antes de pagarlo.

**Qué me haría cambiarlo:** si nunca lo alcanzo, está demasiado alto y no está limitando nada — lo
bajaría a 1. Si lo alcanzo todo el tiempo pero porque hay trabajo genuinamente bloqueado esperando a
terceros, subirlo a 3 sería tratar el síntoma; lo correcto sería atacar la causa del bloqueo. La
señal que me haría subirlo de verdad es sumar gente al equipo.

### Diagnóstico de la historia mal escrita

La historia del ejercicio es: *«Como desarrollador quiero crear la tabla usuarios para guardar los
datos.»*

**Por qué está mal:** es una **tarea disfrazada de historia**. Las tres partes del formato fallan.
El *rol* es el desarrollador, que no es el beneficiario sino quien ejecuta. La *capacidad* describe
el **cómo** (crear una tabla) en vez del **qué**: fija la solución técnica antes de decir qué
problema resuelve. Y el *beneficio* es circular — «para guardar los datos» es la definición de lo
que hace una tabla, no un valor para nadie. Además viola dos criterios de INVEST: no es **valiosa**
por sí sola (nadie percibe una tabla) ni **testeable** (no hay criterio de aceptación posible que no
sea «la tabla existe»).

**Cómo la reescribiría:** corriendo el foco al usuario real y al valor. En mi app sería *«Como
comensal quiero que el sistema recuerde mis datos de contacto para no tener que cargarlos en cada
reserva»*, con criterios de aceptación verificables: que una segunda reserva con el mismo teléfono
precargue nombre y email; que no se dupliquen comensales con el mismo teléfono; que se pueda
corregir un dato mal cargado. La tabla desaparece de la historia y baja a donde corresponde: es una
**tarea** de esa historia.

**La regla que me llevo:** si el «para…» describe cómo funciona la solución en vez de qué gana
alguien, lo que escribiste es una tarea.

### Problemas encontrados y cómo los solucioné

- **El panel rápido para crear un campo no deja configurarlo.** Al agregar el campo `Sprint` desde
  el `+` de la vista de tabla, la interfaz solo ofrecía elegir el tipo: no dejaba escribir el nombre
  ni fijar la duración de la iteración, y lo guardaba con los valores por defecto (nombre
  «Iteration», duración de 2 semanas). La configuración completa está en otro lado: menú `⋯` →
  **Settings** → **Fields**, donde sí aparecen juntos el nombre, el tipo, la fecha de inicio y la
  duración. Ahí lo renombré a `Sprint` y lo pasé a 1 semana.

  El detalle que casi se me pasa: al cambiar la duración, **las iteraciones ya generadas conservan
  la vieja**. El cambio solo aplica a las que se creen después, así que hubo que borrar las de dos
  semanas para que regenerara las de una. Si no, habría quedado defendiendo un sprint de una semana
  con un tablero que mostraba iteraciones de dos — una incoherencia entre lo que digo y lo que la
  herramienta muestra, que es exactamente lo que se mira en la defensa.

- **Me olvidé el `Closes #N` y la trazabilidad no existía.** Preparando la defensa revisé el tablero
  y encontré los cinco items en *Todo* y la columna *Done* vacía: ninguna tarea se había cerrado
  sola. El Pull Request que creó `.github/workflows/ci.yml` no llevaba `Closes #10` en su
  descripción, así que se mergeó sin tocar el issue. Y lo peor del caso es **cómo falla**: no da
  error ni advertencia — el PR entra normalmente y el issue queda abierto, así que si no vas a
  mirarlo no te enterás. La jerarquía y el sprint estaban bien; lo único que faltaba era el enganche,
  que es justamente lo que el práctico evalúa.

  Lo resolví con un Pull Request posterior que completa el workflow de build —le agrega el bloque
  `concurrency`, para que una corrida nueva del mismo PR cancele la anterior en vez de dejarla
  gastando minutos verificando código que ya quedó atrás— y esta vez sí lleva `Closes #10` en la
  descripción. Al mergearse, el issue se cerró solo y la tarjeta pasó a *Done*.

  **Aclaración honesta sobre el alcance de esa tarea:** su título dice «build y tests», y lo que hoy
  está hecho es la parte de build — el pipeline todavía no corre tests, porque eso es el TP5. Si
  tuviera que rehacer la planificación partiría esa tarea en dos, una por cada mitad. La historia
  queda abierta en 1 de 2 justamente por eso: falta la tarea #11.


### Declaración de uso de IA

Usé **Claude (Cowork)** en este TP para dos cosas:

1. **Ordenar el procedimiento**: a partir del enunciado, armar la secuencia de pasos sobre la web de
   GitHub (crear el proyecto, las etiquetas, los cinco issues, la jerarquía de sub-issues, el
   tablero con su sprint y su límite, y el pull request con `Closes #N`) y los textos de los issues.
2. **Redactar esta sección**: la justificación escrita de la duración del sprint y del límite de
   trabajo en progreso, y el diagnóstico de la historia mal escrita.

**Las decisiones son mías, la redacción es asistida.** El sprint de 1 semana y el límite en 2 los
elegí yo entre las opciones posibles; lo que la IA hizo fue ayudarme a poner por escrito el porqué.

**Cómo lo verifiqué:**

- Ejecuté yo cada paso en la web de GitHub. La IA no tuvo acceso a mi cuenta ni a mi proyecto.
- El procedimiento propuesto no coincidía del todo con la interfaz real —lo del campo `Sprint` de la
  sección anterior es el ejemplo—, así que lo corregí contra lo que la herramienta efectivamente
  muestra, no contra lo que la IA suponía.
- Comprobé la trazabilidad en vivo en vez de darla por hecha: verifiqué que el `Closes #N` cerrara
  **la tarea** y no la historia, que la tarjeta se moviera sola a *Done*, y que desde la tarea
  cerrada se pueda navegar al PR y subir hasta la épica.
- Contrasté el diagnóstico de la historia mal escrita contra el marco teórico del enunciado (§2.3:
  formato de historia de usuario, INVEST, criterios de aceptación) y lo reescribí sobre **mi**
  aplicación, no sobre el ejemplo genérico: la historia reescrita habla del comensal y de sus datos
  de contacto, que es un caso real de mi sistema de reservas.

---

## TP4 — CI: Pipelines as Code

### Estructura del pipeline: dos jobs en paralelo

`.github/workflows/ci.yml` tiene dos jobs, **`build-app`** y **`build-migrate`**, que corren en
paralelo y construyen dos etapas distintas del mismo `Dockerfile`: `runner` y `migrator`.

**Por qué dos y no uno.** Mi aplicación es un monolito con un solo `Dockerfile` (ver TP2), pero
publica **dos imágenes**, y el pipeline verifica lo que la aplicación realmente tiene. No es
paralelismo decorativo para llegar a un número: si mañana rompo la etapa `migrator` —por ejemplo
copiando mal `src/db`— quiero enterarme aunque la app compile perfecto. Con un solo job que
construyera únicamente `runner`, ese error llegaría a producción sin que nadie lo viera.

Eso se comprobó solo durante la demostración del gate: al romper un import del frontend, `build-app`
quedó en rojo y `build-migrate` en verde. Dos señales distintas sobre el mismo commit, que es
exactamente para lo que sirve separarlos.

**Por qué en paralelo.** No hay dependencia entre ellos: ninguno consume la salida del otro, así que
serializarlos solo sumaría espera. En paralelo, el tiempo del pipeline es el del job más lento y no
la suma de los dos.

**Qué NO comparten dos jobs.** Nada. Cada uno corre en su propia máquina virtual limpia, que GitHub
crea y destruye: no comparten disco, ni sistema de archivos, ni el cache local de Docker, ni el
`node_modules`. Por eso los dos ejecutan la etapa `deps` por su cuenta y hacen el mismo
`pnpm install` dos veces. Eso no es un desperdicio evitable: es el precio del aislamiento, que es lo
que hace que un job no pueda contaminar al otro. Lo único que comparten es el cache externo, y solo
porque se lo configuró explícitamente.

### Qué cachea el pipeline, y qué pasa si el cache desaparece

Cachea **las capas de la imagen**, con `type=gha` — el almacén de GitHub Actions, que sobrevive
entre corridas. No es el Docker de mi máquina ni el del runner, que nace vacío cada vez. Hacen falta
tres cosas juntas: `setup-buildx-action` (el constructor de fábrica guarda las capas en el disco de
la máquina, que se destruye al terminar; este otro sabe exportarlas), `cache-from` para traerlas al
empezar y `cache-to: mode=max` para guardarlas al terminar, incluidas las intermedias.

**Qué se reutilizó, medido en la segunda corrida:**

| Job | Capas reutilizadas | Las que importan |
|---|---|---|
| `build-app` | 13 | `RUN pnpm build` (compila Next entero) y `RUN pnpm install --frozen-lockfile` (830 dependencias) |
| `build-migrate` | 9 | la misma cadena `deps`, más los `COPY` de `src` y de la configuración |

**Qué invalida una capa.** El orden del `Dockerfile` es lo que decide cuánto se reutiliza. Como
`package.json` y `pnpm-lock.yaml` se copian **antes** que el código, un cambio de código no toca la
capa de dependencias: se reutiliza el `pnpm install` y se rehace solo desde el `COPY . .`. Si en
cambio agrego una dependencia, cambia el lockfile y se cae toda la cadena de ahí para abajo.

**El `scope` por job no es opcional.** Los dos jobs usan `scope=app` y `scope=migrate`. Sin eso
comparten el estante por defecto y **se pisan**: el último en terminar sobreescribe el cache del
otro, y el síntoma es desconcertante — un job muestra `CACHED` y el otro no, y cuál cambia en cada
corrida según quién terminó último. No falla, no avisa, y parece azar.

Por eso las capas de `deps` aparecen cacheadas en los **dos** jobs pese a ser las mismas
instrucciones: en la primera corrida cada uno las construyó por su cuenta y guardó su propia copia
en su propio estante.

**Qué pasa si el cache desaparece: nada se rompe, solo tarda más.** El cache es una optimización, no
una dependencia — cada corrida puede construir todo desde cero y llegar al mismo resultado. GitHub
además lo desaloja solo: expulsa entradas que no se usan hace una semana, y cuando el repositorio
pasa su límite de almacenamiento borra las más viejas. Un pipeline que *necesita* el cache para
funcionar está mal hecho, porque su resultado dependería de un estado que puede no existir — y eso
es exactamente lo contrario de lo que un pipeline promete.

Un detalle que sorprende: **la segunda corrida no tiene por qué ser más rápida.** Guardar el cache
también cuesta, y cada corrida cae en una máquina distinta. Con una app de este tamaño la ganancia
es chica; la evidencia de que el cache funciona es la palabra `CACHED` en el log, no el cronómetro.

### Por qué el pipeline construye con mi Dockerfile en vez de compilar por su cuenta

Porque si el workflow compilara con sus propios pasos (`pnpm install`, `pnpm build`) habría **dos
definiciones de build** para la misma aplicación: la del workflow y la del `Dockerfile`. Dos
definiciones que empiezan iguales y divergen, porque alguien va a cambiar una y olvidarse de la
otra. El día que eso pase, el pipeline estaría verificando una compilación **distinta** de la que se
publica y se despliega — y un pipeline que verifica algo que no es lo que sale a producción no sirve
para nada.

Construyendo con el `Dockerfile`, el artefacto que el pipeline verifica es **el mismo** que el TP2
publica en el registry y el que el TP6 va a desplegar. Una sola definición, un solo lugar donde
cambiarla.

Consecuencia visible: en mi `ci.yml` no hay una sola línea de Node, de pnpm ni de Next. El workflow
no sabe cómo se compila mi aplicación — eso lo sabe el `Dockerfile`. Por eso este mismo archivo le
serviría a un compañero con otro stack cambiando únicamente el `context` y el `target`.

### Problemas encontrados y cómo los solucioné

- **Un Pull Request sin nada que comparar.** Para poder mostrar el `strict: true` en acción hacen
  falta **dos** PRs abiertos a la vez: uno que se mergee y mueva `main`, y otro que quede
  desactualizado. Creé la rama del segundo, la pusheé, y al abrir el PR GitHub me dijo *«There isn't
  anything to compare»*. La causa: el cambio que le había hecho al README no llegó a commitearse
  —`git commit -am` no commitea si no hay nada modificado, y no falla: avisa y sigue— así que la
  rama subió idéntica a `main`. Una rama sin commits propios no tiene diferencias, y sin
  diferencias no hay Pull Request posible.

  Lo aproveché para algo mejor que un cambio de relleno: usé esa rama para agregar **el badge**, que
  el práctico pide igual y también tiene que entrar por PR. Así el segundo PR dejó de ser
  decorativo, y la demostración del `strict` salió sobre un cambio real.

<!-- Agregá acá cualquier otro tropiezo: el buscador del gate que solo ofrece checks de los últimos
     7 días, algún build que ande local y falle en el runner, etc. -->

### Declaración de uso de IA

Usé **Claude (Cowork)** para redactar el `.github/workflows/ci.yml` a partir del enunciado y de mi
`Dockerfile` del TP2, para ordenar la secuencia de la demostración del gate, y para escribir el
borrador de esta sección.

**Cómo lo verifiqué:**

- Corrí el pipeline yo y leí los logs: comprobé la palabra `CACHED` en los dos jobs de la segunda
  corrida y conté cuántas capas reutilizó cada uno — los números de la tabla de arriba salen de ahí,
  no de una estimación.
- Verifiqué el gate haciéndolo actuar, no mirando la configuración: rompí el build a propósito
  (PR #16), confirmé que `build-app` quedaba en rojo, que `build-migrate` seguía en verde y que aun
  así el merge estaba bloqueado, lo arreglé y vi el PR destrabarse.
- Comprobé el `strict: true` con dos PRs abiertos al mismo tiempo, viendo aparecer el cartel de rama
  desactualizada después de mergear el primero.
- Las protecciones de rama y los required status checks los configuré yo en la web. La IA no tuvo
  acceso a mi cuenta de GitHub.
