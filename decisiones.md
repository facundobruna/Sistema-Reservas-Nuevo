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


---

## TP5 — Calidad automatizada: tests, coverage y el umbral que frena un merge

> Sección escrita mientras trabajo, un paso a la vez. Los marcadores `PENDIENTE-URL` son links a
> corridas o PRs que todavía no existen; se reemplazan por la dirección real cuando existan.

### Qué lógica elegí testear y por qué esa

Elegí cuatro reglas del backend, buscando en cada una **dónde duele un bug**, no dónde es fácil
escribir un test:

| Regla | Dónde vive | Qué pasa si tiene un bug |
|---|---|---|
| Máquina de estados de la reserva | `lib/reservation/status-machine.ts` | Una transición inválida (por ejemplo volver una reserva `completed` a `pending`) corrompe el estado de la operación del restaurante. Es la regla que más lugares tocan. |
| Ventana de reserva (anticipación mínima y máxima) | `lib/availability/now-filter.ts` | Todo está en los bordes (`<` contra `<=`). Un borde corrido deja reservar con cero minutos de anticipación o rechaza la última hora válida: el comensal pierde una mesa o el restaurante recibe una reserva imposible. |
| Acceso al panel según la suscripción | `lib/billing/panel-access.ts` | Bloquear a un restaurante que paga lo deja sin su herramienta de trabajo; dejar pasar a uno que no paga es plata que no entra. Tiene muchas ramas y depende de la fecha. |
| Token firmado | `lib/auth/signed-token.ts` y `action-token.ts` | Es seguridad: si acepta una firma inválida o un token vencido, alguien puede actuar sobre una reserva que no es suya. |

<!-- PENDIENTE-URL: PR de infraestructura mergeado, donde se ven los tests de estas cuatro reglas -->

### Qué entra en la cuenta de cobertura y qué quedó afuera (backend)

La cobertura del backend mide **`src/lib`**: la lógica de negocio. No mide `src/db` (esquema,
migraciones generadas y consultas contra Postgres) ni `src/app` (los route handlers reciben el
pedido, delegan y responden).

Dentro de `src/lib` dejé afuera, y cada una tiene una razón técnica distinta:

- **`lib/email/**` y `lib/billing/mercadopago.ts`**: adaptadores a servicios de afuera (Resend, Mercado
  Pago) y la fábrica que elige cuál usar según una variable de entorno. Son el borde del sistema:
  hablan con alguien más.
- **`session.ts`, `diner-session.ts`, `superadmin-session.ts`, `require-staff.ts`,
  `require-superadmin.ts`**: dependen de `cookies()`, `NextResponse` y `redirect()` de Next, que solo
  existen dentro de un request real del framework.
- **`load-availability-input.ts` y `book-reservation.ts`**: hablan con Postgres. Tienen lógica de
  verdad (best-fit, reintentos por deadlock) y la cubre el test de integración, pero ese necesita una
  base y el pipeline de cobertura corre sin ella.

Lo que **no** hice: excluir un archivo porque no lo testeé. Excluir para subir el número es hacerse
trampa, y es lo primero que revisaría alguien que lee el `vitest.config.ts`. La diferencia entre
«no cuenta porque es infraestructura» y «no cuenta porque me da fiaca testearlo» está en que la
primera razón se puede escribir y defender. Eso último sirve de criterio: cada línea de la lista
`exclude` tiene su comentario con el porqué.

**Medición de partida** (solo tests unitarios, antes de escribir ninguno nuevo): **36 % de líneas
(81/225)** y **29,01 % de ramas (47/162)**. Solo `compute-availability.ts` estaba cubierto; las
otras cuatro reglas estaban en 0 %.

<!-- PENDIENTE-URL: corrida con el reporte de cobertura (summary + artefacto descargable) -->

### Refactor para poder testear: `evaluatePanelAccess`

La regla del acceso al panel vivía en `db/subscription.ts`, mezclada con cuatro funciones que
consultan Postgres. Para testearla había que importar ese archivo, y eso arrastra el cliente de la
base: no se puede ejecutar sin una conexión configurada. Además `src/db` está fuera de la cuenta de
cobertura, así que aunque la hubiera testeado, no habría sumado.

La moví a `lib/billing/panel-access.ts` **sin cambiar ninguna línea de su lógica**: un refactor que
además cambia comportamiento no permite saber cuál de los dos cambios rompió algo. Dos decisiones
chicas:

- La regla recibe un tipo mínimo (`PanelAccessSubscription`: solo `status` y `trialEndsAt`) en
  lugar de la fila completa de Drizzle. La fila real cumple esa forma, así que se le pasa tal cual,
  pero la regla ya no depende del esquema.
- `db/subscription.ts` la **re-exporta**, de modo que el único que la importaba (la ruta
  `admin/panel-access`) no cambió.

El principio es separar **la decisión** de **la infraestructura**: la decisión no necesita saber de
dónde vienen los datos. Efecto colateral que conviene entender: al pasar la regla (8 líneas, 12 ramas,
todas sin cubrir) de un lugar que no se medía a uno que sí, el porcentaje bajó antes de subir con los
tests: de **36 % a 34,76 %** de líneas (81/233) y de **29,01 % a 27,01 %** de ramas (47/174). No cambió
el código, cambió lo que se cuenta.

<!-- PENDIENTE-URL: PR de infraestructura mergeado (commit del refactor) -->

### Refactor para poder mockear: el envío de mails del worker

El enunciado pide al menos un test con mock, y aclara que «mi lógica es pura» no vale: si el código
no tiene por dónde meterlo, hay que refactorizar. El candidato natural era el worker
(`jobs/worker.ts`), que manda los mails de confirmación y recordatorio.

**Por qué no se podía testear antes.** Había dos obstáculos, y el segundo es el que no se ve a
primera vista:

1. La lógica de armar y mandar el mail estaba adentro de `processDueNotifications`, mezclada con
   llamadas a la base (`markNotificationSent`, `recordNotificationFailure`). No se podía ejecutar la
   parte del mail sin la parte de la base.
2. `worker.ts` **arranca todo al importarlo**: la última línea es `main()`, que se conecta a Postgres
   y levanta pg-boss. Un test que importara el archivo habría intentado conectarse a una base real.

**Qué cambié.** Saqué esa lógica a `lib/reservation/send-customer-notification.ts`, una función
`sendCustomerNotification(sender, notificación, appUrl)` que arma el mail y llama a
`sender.send(...)`. El código es el mismo, movido tal cual. Tres cosas distintas respecto de antes:

- El **sender entra por parámetro** (inyección de dependencias). En producción el worker le pasa el
  de verdad (Resend o consola); un test le pasa un doble. Es lo que hace posible el mock.
- La **URL base también entra por parámetro** en vez de leerse de una constante del módulo, para que
  el resultado no dependa del entorno donde corre.
- **No marca la notificación como enviada ni como fallida.** Eso es persistencia y se queda en el
  worker. Si `send` falla, la función deja subir el error sin tocarlo, y el worker decide reintentar.

Lo que **no** toqué: el aviso al staff y la lista de espera siguen como estaban. Moví lo necesario
para tener una pieza mockeable, no reescribí el worker.

El test con mock va a verificar la **interacción**: que `send` se llame una vez, con el destinatario
correcto, con el adjunto `.ics` solo en la confirmación y con el link «confirmo que voy» solo en el
recordatorio.

<!-- PENDIENTE-URL: PR de infraestructura mergeado (commit del refactor del worker y su test con mock) -->

### La suite del backend: qué verifica cada test

Escribí **16 métodos de test nuevos** (más los 17 que ya había del motor de disponibilidad), todos con
estructura Arrange / Act / Assert marcada en el código, repartidos en cinco archivos de
`backend/tests/unit/`. Los tests parametrizados se expanden en más casos (la suite completa
corre 68, contando los 2 métodos del ejercicio de la rama sin cubrir, más abajo).

| Archivo | Regla | Tests | Qué fija |
|---|---|---|---|
| `status-machine.test.ts` | Estados de la reserva | 2, parametrizados | Las 8 transiciones válidas y 10 inválidas, incluyendo `seated → no_show` (una vez sentados ya vinieron) y que los estados terminales no tienen salida |
| `booking-window.test.ts` | Ventana de reserva | 3 | Los **bordes**: justo en la anticipación mínima se acepta, un minuto antes no; justo en el tope máximo se acepta, un minuto después no; `null` significa sin tope |
| `panel-access.test.ts` | Acceso al panel | 2 | Una tabla con los 8 escenarios (suspendido gana sobre todo, sin suscripción, activa, prueba vigente / vencida / sin fecha, impaga, cancelada) y el borde exacto del vencimiento, con el reloj congelado |
| `tokens.test.ts` | Token firmado | 5 | Ida y vuelta, token vencido, contenido alterado con la firma original, formatos mal formados (parametrizado) y que sin `AUTH_SECRET` no firma |
| `send-customer-notification.test.ts` | Mail al comensal (**el mock**) | 4 | Qué se le pide al servicio de mails: destinatario, `.ics` solo en la confirmación, link de «confirmo que voy» solo en el recordatorio, vencimiento del token, y que si el envío falla el error sube |

**Las tres técnicas, en el backend.** Parametrizado: `status-machine`, `booking-window` y
`panel-access` usan `it.each`. Caso de error: token vencido, alterado, mal formado, sin secreto, y el
envío que falla. Mock: `send-customer-notification`, donde `send` es un `vi.fn()`.

**Mock, y por qué no es un stub.** El `EmailSender` falso responde siempre «ok» (eso, solo, sería un
stub: una respuesta enlatada para que el código siga). Lo que lo convierte en mock es que el test
**verifica cómo lo llamaron**: cuántas veces, a quién y con qué adjuntos. Reemplaza al servicio que
manda mails de verdad, y por eso el test no manda ninguno.

**Cómo comprobé que los tests verifican algo.** El criterio del enunciado es que si cambio una
regla, algún test se ponga en rojo. Lo hice a mano: rompí 14 veces el código a propósito, una a la
vez (un `<` a `<=` en cada borde, que el suspendido deje de ganar, que `past_due` pase a `ok`,
que un `seated` pueda ir a `no_show`, que el token acepte vencidos o no chequee la firma, que el
mail salga a otro destinatario o con el adjunto en el lugar equivocado), y **los 14 cambios pusieron
al menos un test en rojo**. Esto no es cobertura: la cobertura dice qué líneas corrieron, esto dice
si alguien se daría cuenta de que cambió el comportamiento.

**Un error mío que atrapé.** El primer test del token del mail falló al correrlo. La fecha de la
reserva de prueba era el 21/07/2026 y el token vence 2 horas después, así que **en cuanto pasó esa
fecha el token ya estaba vencido** y la verificación daba `null`. El test habría pasado el día que lo
escribí y fallado después, sin que nadie tocara el código: un test *flaky* por depender del reloj
real. Lo arreglé congelando el reloj antes del fin de la reserva. Es la misma razón por la que
`panel-access.test.ts` congela la fecha.

<!-- PENDIENTE-URL: PR de infraestructura mergeado (los tests de las cuatro reglas y el mock) -->

### Frontend: qué entra en la cuenta, qué quedó afuera y la suite

El frontend no tiene base de datos ni reglas de negocio de reservas (eso quedó en el backend con la
separación), así que su lógica propia es chica: el cliente que le habla a la API, las guardas de
sesión, la validación del teléfono y el reemplazo de textos. Eso es lo que se mide.

**Entra en la cuenta:** `src/lib/**/*.ts`.

**Queda afuera, y por qué:**

- **`src/app` y `src/components`** (pantallas y componentes de React). Probarlos exige un DOM, y el
  enunciado pide tests sin DOM. Es la salvedad más importante: **el número del frontend dice cuánta de
  la lógica está verificada, no cuánta de la interfaz.** Dentro de `src/app` también hay código que
  no es visual (por ejemplo el `api()` privado de `admin/[slug]/_lib/api.ts`, que arma el `ApiError`),
  pero está mezclado con los hooks de React Query y no se puede probar sin ellos.
- **`lib/api/types.ts`**: solo tipos de TypeScript; se borran al compilar, no hay código que ejecutar.
- **`lib/i18n/dictionaries.ts`**: los textos en español e inglés; datos, sin ninguna decisión.
- **`lib/utils.ts`**: el helper `cn` que genera shadcn; una línea que delega en dos librerías.

**La suite: 12 métodos nuevos** en `frontend/tests/unit/` (expanden a 26 casos):

| Archivo | Tests | Técnica |
|---|---|---|
| `phone.test.ts` | `normalizeArPhone` (5 casos), `e164Phone` acepta (4) y rechaza (7) | Parametrizados; el rechazo es el caso de error, con los bordes de 7 y 15 dígitos |
| `i18n.test.ts` | `interpolate` reemplaza, y deja el token a la vista si falta el valor | Caso de borde: un valor ausente no rompe ni muestra `undefined` |
| `api-server.test.ts` | `apiGet` reenvía las cookies / no manda cookie sin sesión (parametrizado); error del backend devuelve el status sin leer el cuerpo | **Mock** de `cookies()` de Next y de `fetch` |
| `auth-guards.test.ts` | `requireStaffPage` redirige al login sin sesión o con sesión de otro restaurante (parametrizado) y deja pasar si es el correcto; `requireSuperadminPage`, ambos caminos | **Mock** de `apiGet` y de `redirect` |

**El mock del frontend.** `apiGet` es la única puerta del frontend hacia el backend, y depende de dos
cosas que solo existen en un servidor real: `cookies()` de Next y `fetch`. Las reemplacé por mocks, de
modo que el test no sale a la red. El test verifica la **interacción**: a qué URL se llamó, qué
cookie se reenvió y con `cache: "no-store"` (son datos por usuario; cachearlos mostraría los de un
restaurante en el panel de otro). En las guardas, el `redirect` mock **lanza una excepción** igual
que el real: si no lo hiciera, el código siguiente correría con datos que no existen y el test
fallaría por una razón que no es la que quiero probar.

**La regla que más importa del frontend** es la de `requireStaffPage`: un usuario logueado en el
restaurante A no puede ver el panel del restaurante B. Por eso es el caso parametrizado con
«la sesión es de otro restaurante».

**Cómo comprobé que verifican algo.** Igual que en el backend, rompí el código 13 veces a propósito
(quitar el 0 inicial del teléfono, correr un borde del largo, no antepone el 9 de celular, no usar
`no-store`, mandar la cookie vacía, no revisar `response.ok`, dejar de comparar el restaurante,
invertir la guarda de superadmin, entre otras) y **las 13 pusieron al menos un test en rojo**.

**Un detalle de empaquetado.** El `.dockerignore` del backend ya dejaba los tests afuera de la imagen
(«la imagen final no los corre»), pero el del frontend tenía esa sección **vacía**. Le agregué
`tests` y `vitest.config.ts`: sin eso los tests entran al contexto de build, y cualquier cambio en
un test invalidaría el cache de la imagen aunque el código no cambie.

<!-- PENDIENTE-URL: corrida con el reporte de cobertura del frontend (summary + artefacto descargable) -->

### El umbral de cobertura: número, métrica y por qué

**El umbral es un piso: la medición de hoy, redondeada hacia abajo, en líneas y en ramas.**

| | Líneas medidas | Ramas medidas | Umbral de líneas | Umbral de ramas |
|---|---|---|---|---|
| Backend | 60,41 % (145/240) | 53,93 % (96/178) | **60 %** | **53 %** |
| Frontend | 96,55 % (28/29) | 95,45 % (21/22) | **96 %** | **95 %** |

El número de **ramas** que me da hoy es 53,93 % en el backend y 95,45 % en el frontend, y lo reporto
siempre, no solo cuando es el que frena.

**Por qué ese criterio y no un 80 %.** Un número elegido sin medir es un número copiado. Un 80 %
rompería `main` hoy mismo (el backend está en 60 %), y la única forma de llegar sería escribir tests
solo para subir el porcentaje, que es justo lo que no quiero. La regla que adopté es «nadie baja
lo que ya tenemos»: el umbral acompaña a la medición real, y cuando se agreguen tests, se sube.

**Por qué las dos métricas.** La de líneas es la intuitiva, pero puede mentir: una línea con un `?:`
o un `??` cuenta como cubierta aunque el test recorra solo uno de sus dos caminos. Lo tengo en mi
propio código: `frontend/src/lib/api/server.ts` tiene **100 % de líneas pero 83 % de ramas**, porque
el valor por defecto de `BACKEND_INTERNAL_URL` (`?? "http://localhost:3000"`) nunca se usa en los
tests. Las ramas muestran lo que las líneas esconden.

**Cómo comprobé que frena de verdad** (corrida local, antes del pipeline): con el código de hoy el
comando termina bien; al agregar a `src/lib` una función corta sin ningún test (2 líneas ejecutables y 4 ramas),
el backend baja a 59,91 % de líneas y 52,74 % de ramas y el comando termina con error:

```
ERROR: Coverage for lines (59.91%) does not meet global threshold (60%)
ERROR: Coverage for branches (52.74%) does not meet global threshold (53%)
```

En el frontend alcanza **una sola** función de una línea sin test para que las líneas bajen a
93,33 % y falle. En el frontend las ramas no se movieron en esa prueba (la función nueva no tenía
ningún `if`), así que ahí frenó solo la métrica de líneas: es la razón por la que miro las dos.

**Qué pasaría si mañana lo subo diez puntos.** El backend pasaría a 70 % de líneas y `main` dejaría de
pasar: hay que cubrir 23 líneas más (168 de 240) antes de poder mergear nada. Para llegar a 80 %
serían 47 líneas más. Lo que falta cubrir está en los esquemas de validación (`validation/*`),
`password.ts`, `magic-link.ts`, `ics.ts`, `staff-alert-email.ts`, `calendar-token.ts` y las dos
funciones de `now-filter.ts` que no pruebo (`isPast` y `excludePastSlots`).

**Qué mide y qué no.** Mide qué líneas y ramas **se ejecutaron** durante los tests, no si el
resultado se **verificó**. Un test que llama a una función sin ningún `expect` suma cobertura y no
prueba nada. El umbral frena el código nuevo que llega **sin que nadie lo ejecute**; no detecta un
test flojo. Eso lo cubre otra cosa (la revisión humana y, en la teoría, las pruebas de mutantes).

**Diferencia con el freno del TP4.** El gate del TP4 se ponía en rojo cuando el código **no
compilaba** (la imagen no se construía). Este se pone en rojo con código que compila perfecto y
cuyos tests pasan todos, porque falta cobertura: bloquea una clase de problema distinta, la de
agregar lógica sin que nada la ejercite.

<!-- PENDIENTE-URL: corrida roja por umbral, con el número en el log -->

### El ejercicio de la rama sin cubrir

Abrí el reporte HTML de cobertura del backend (`backend/coverage/index.html`), entré a los archivos
con líneas marcadas y elegí esta rama.

**1. Qué línea es.** `backend/src/lib/availability/compute-availability.ts`, función
`applyExceptionHours`, **línea 32**:

```ts
if (exception?.kind === "special_hours" && exception.startTime && exception.endTime) {
  return { ...shift, startTime: exception.startTime, endTime: exception.endTime };   // línea 32
}
```

En el reporte la línea 32 aparecía **en rojo: nunca se ejecutaba**. Un `if` tiene dos caminos y la
suite solo recorría el que no entra: los tests que pasaban una excepción usaban `closed` (día cerrado)
o ninguna. El camino que cambia el horario del turno por el de la excepción no lo ejercitaba nadie.

**2. Qué entrada la recorre.** Un día de horario especial con horas cargadas, por ejemplo
`{ kind: "special_hours", startTime: "12:00", endTime: "15:00" }` sobre un turno normal de 20:00 a
23:00: ese día los horarios disponibles tienen que ser 12:00, 12:30, 13:00 y 13:30. (El último es
13:30 porque la mesa de 90 minutos tiene que terminar a las 15:00.) El `&&` de la condición tiene
además otros caminos: una excepción de horario especial **incompleta**, a la que le falta la hora de
inicio, la de fin o las dos, tiene que dejar el horario normal del turno.

**3. Qué decidí: agregué el test.** Dos métodos en `tests/unit/special-hours.test.ts` (uno para el
reemplazo del horario, otro parametrizado para las tres variantes de excepción incompleta). Lo agregué
porque no es un detalle: es una regla de negocio real (el restaurante que un feriado abre solo de 12 a
15), y un bug ahí le cambiaría los horarios a un restaurante sin que ningún test avisara. Que el
motor de disponibilidad tuviera un test de `closed` pero ninguno de `special_hours` era una asimetría
que la cobertura dejó a la vista.

Para comprobar que verifican algo rompí `applyExceptionHours` tres veces (invertir el `===`, cambiar el
`&&` por `||`, usar la hora de inicio del turno en vez de la de la excepción) y las tres hicieron
fallar tests.

El efecto en el número es chico (líneas de 60,41 % a 60,83 %, ramas de 53,93 % a 55,61 %), y no
lo agregué por eso: la cobertura me indicó **dónde mirar**, y lo que justificó el test fue la regla.

**Una rama que decidí no cubrir, por contraste:** el `catch` de `signed-token.ts` (un contenido bien
firmado pero que no es JSON). Para llegar ahí alguien tendría que firmar basura con mi clave secreta,
algo que mi código nunca hace; es código defensivo que no vale un test.

<!-- PENDIENTE-URL: reporte de cobertura donde se ve la línea (corrida del pipeline) -->

<!-- Secciones que faltan, a medida que se hacen los pasos:
     - por qué coverage alto no es calidad (ejemplo propio)
     - el PR bloqueado: qué check, qué métrica, qué escribí para arreglarlo
     - tabla «Tu stack, de un vistazo»: herramienta por cada fila
     - problemas encontrados (tsc ya fallaba en 3 tests viejos de main; el lockfile al agregar la dependencia; coverage/ lo lintaba eslint)
     - declaración de uso de IA -->
