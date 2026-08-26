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
