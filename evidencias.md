# Evidencias — Ingeniería del Software 3 (UCC 2026)

Capturas y salidas que respaldan cada TP. Se acumulan hacia abajo, igual que `decisiones.md`.

---

## TP1 — Git colaborativo

### 1. Push directo a `main` rechazado

![Push directo a main rechazado](img/tp1-push-rechazado.png)

Intento de `git push` directo sobre `main` estando parado en la rama protegida. GitHub lo rechaza
con `protected branch hook declined`: la regla exige que todo cambio entre por Pull Request, y con
*Do not allow bypassing* activado alcanza **también al dueño del repositorio**. Una protección que
el administrador puede saltear no protege nada.

Comando ejecutado:

```
echo "test" >> README.md
git commit -am "test: intento de push directo"
git push
```

### 2. El Pull Request de la rama B no se puede mergear: conflicto

![Aviso de conflicto en el PR de la rama B](img/tp1-conflicto-aviso.png)

`feature/titulo-a` y `feature/titulo-b` salieron las dos de `main` y modificaron la misma línea del
`README.md`. Una vez mergeada A, GitHub detecta que B ya no se puede integrar automáticamente y
deshabilita el botón de merge hasta resolver.

### 3. Los marcadores del conflicto

![Marcadores de conflicto en el editor de GitHub](img/tp1-conflicto-marcadores.png)

El editor de resolución muestra las dos versiones del fragmento separadas por `<<<<<<<`, `=======` y
`>>>>>>>`. Arriba la versión de mi rama, abajo la que ya está en `main`. Resolver es decidir el
contenido final y borrar los marcadores, no ejecutar un comando.

### 4. Release `v1.0.0` publicada

![Release v1.0.0](img/tp1-release.png)

Tag anotado `v1.0.0` sobre `main` y su release publicada con las notas de qué incluye esta versión.
Semver: `MAJOR.MINOR.PATCH` — primera versión estable de la entrega.

---

## TP2 — Contenedores

### 1. `docker compose up -d` desde cero y el sistema funcionando

![docker compose up desde cero](img/tp2-compose-up.png)
docker compose up -d --build
[+] down 4/4
 ✔ Container sistema-reservas-app-1     Removed                                                                                                                                 0.1s
 ✔ Container sistema-reservas-migrate-1 Removed                                                                                                                                 0.3s
 ✔ Container sistema-reservas-db-1      Removed                                                                                                                                 0.6s
 ✔ Network sistema-reservas_default     Removed                                                                                                                                 0.4s
#1 [internal] load local bake definitions
#1 reading from stdin 1.08kB done
#1 DONE 0.0s

#2 [migrate internal] load build definition from Dockerfile
#2 transferring dockerfile: 4.18kB 0.0s done
#2 DONE 0.0s

#3 [migrate] resolve image config for docker-image://docker.io/docker/dockerfile:1
#3 DONE 2.6s

#4 [app] docker-image://docker.io/docker/dockerfile:1@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32
#4 resolve docker.io/docker/dockerfile:1@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32 0.1s done
#4 CACHED

#5 [app internal] load metadata for docker.io/library/node:22-alpine
#5 DONE 4.3s

#6 [migrate internal] load .dockerignore
#6 transferring context: 791B 0.0s done
#6 DONE 0.0s

#7 [app internal] load build context
#7 DONE 0.0s

#8 [migrate deps 1/6] FROM docker.io/library/node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
#8 resolve docker.io/library/node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 0.1s done
#8 DONE 0.1s

#9 [migrate deps 2/6] RUN apk add --no-cache libc6-compat
#9 CACHED

#10 [migrate runner 3/7] WORKDIR /app
#10 CACHED

#9 [app deps 2/6] RUN apk add --no-cache libc6-compat
#9 CACHED

#11 [migrate internal] load build context
#11 transferring context: 17.58kB 0.1s done
#11 DONE 0.2s

#12 [migrate deps 5/6] COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
#12 CACHED

#13 [migrate deps 3/6] RUN corepack enable
#13 CACHED

#14 [migrate deps 4/6] WORKDIR /app
#14 CACHED

#15 [migrate deps 6/6] RUN pnpm install --frozen-lockfile
#15 CACHED

#7 [app internal] load build context
#7 transferring context: 39.97kB 0.1s done
#7 DONE 0.2s

#15 [app deps 6/6] RUN pnpm install --frozen-lockfile
#15 CACHED

#13 [app deps 3/6] RUN corepack enable
#13 CACHED

#14 [app deps 4/6] WORKDIR /app
#14 CACHED

#16 [app deps 5/6] COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
#16 CACHED

#17 [app deps 6/6] RUN pnpm install --frozen-lockfile
#17 CACHED

#18 [app builder 5/7] COPY --from=deps /app/node_modules ./node_modules
#18 CACHED

#19 [app builder 6/7] COPY . .
#19 DONE 0.2s

#20 [migrate migrator 4/6] COPY --from=deps /app/node_modules ./node_modules
#20 ...

#21 [app builder 7/7] RUN pnpm build
#21 1.107 ! Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-11.24.0.tgz
#21 3.710 $ next build
#21 4.466 ▲ Next.js 16.2.9 (Turbopack)
#21 4.467 
#21 4.526   Creating an optimized production build ...
#21 11.52 ✓ Compiled successfully in 6.6s
#21 11.54   Running TypeScript ...
#21 ...

#20 [migrate migrator 4/6] COPY --from=deps /app/node_modules ./node_modules
#20 DONE 20.3s

#22 [migrate migrator 5/6] COPY package.json tsconfig.json ./
#22 DONE 0.4s

#21 [app builder 7/7] RUN pnpm build
#21 ...

#23 [migrate migrator 6/6] COPY src ./src
#23 DONE 0.1s

#24 [migrate] exporting to image
#24 exporting layers
#24 ...

#21 [app builder 7/7] RUN pnpm build
#21 23.36   Finished TypeScript in 11.8s ...
#21 23.37   Collecting page data using 19 workers ...
#21 25.32   Generating static pages using 19 workers (0/36) ...
#21 25.45   Generating static pages using 19 workers (9/36) 
#21 25.58   Generating static pages using 19 workers (18/36) 
#21 25.63   Generating static pages using 19 workers (27/36) 
#21 26.03 ✓ Generating static pages using 19 workers (36/36) in 707ms
#21 26.04   Finalizing page optimization ...
#21 26.99 
#21 27.00 Route (app)
#21 27.00 ┌ ○ /
#21 27.00 ├ ○ /_not-found
#21 27.00 ├ ƒ /admin/[slug]
#21 27.00 ├ ƒ /admin/[slug]/billing
#21 27.00 ├ ƒ /admin/[slug]/combos
#21 27.00 ├ ƒ /admin/[slug]/customers
#21 27.00 ├ ƒ /admin/[slug]/exceptions
#21 27.00 ├ ƒ /admin/[slug]/login
#21 27.00 ├ ƒ /admin/[slug]/mesas
#21 27.00 ├ ƒ /admin/[slug]/services
#21 27.00 ├ ƒ /admin/[slug]/settings
#21 27.00 ├ ƒ /admin/[slug]/share
#21 27.00 ├ ƒ /admin/[slug]/shifts
#21 27.00 ├ ƒ /admin/[slug]/stats
#21 27.00 ├ ƒ /admin/[slug]/timeline
#21 27.00 ├ ƒ /admin/[slug]/zones
#21 27.00 ├ ƒ /api/v1/admin/billing/status
#21 27.00 ├ ƒ /api/v1/admin/billing/subscribe
#21 27.00 ├ ƒ /api/v1/admin/calendar-token/regenerate
#21 27.00 ├ ƒ /api/v1/admin/customers
#21 27.00 ├ ƒ /api/v1/admin/customers/export
#21 27.00 ├ ƒ /api/v1/admin/exceptions
#21 27.00 ├ ƒ /api/v1/admin/exceptions/[id]
#21 27.00 ├ ƒ /api/v1/admin/mesa-blocks
#21 27.00 ├ ƒ /api/v1/admin/mesa-blocks/[id]
#21 27.00 ├ ƒ /api/v1/admin/mesas
#21 27.00 ├ ƒ /api/v1/admin/mesas/[id]
#21 27.00 ├ ƒ /api/v1/admin/reservations
#21 27.00 ├ ƒ /api/v1/admin/reservations/[id]
#21 27.00 ├ ƒ /api/v1/admin/seating-units
#21 27.00 ├ ƒ /api/v1/admin/seating-units/[id]
#21 27.00 ├ ƒ /api/v1/admin/services
#21 27.00 ├ ƒ /api/v1/admin/services/[id]
#21 27.00 ├ ƒ /api/v1/admin/settings
#21 27.00 ├ ƒ /api/v1/admin/shifts
#21 27.00 ├ ƒ /api/v1/admin/shifts/[id]
#21 27.00 ├ ƒ /api/v1/admin/stats
#21 27.00 ├ ƒ /api/v1/admin/timeline
#21 27.00 ├ ƒ /api/v1/admin/zones
#21 27.00 ├ ƒ /api/v1/admin/zones/[id]
#21 27.00 ├ ƒ /api/v1/auth/diner/magic-link
#21 27.00 ├ ƒ /api/v1/auth/diner/verify
#21 27.00 ├ ƒ /api/v1/auth/staff/login
#21 27.00 ├ ƒ /api/v1/auth/staff/logout
#21 27.00 ├ ƒ /api/v1/auth/superadmin/login
#21 27.00 ├ ƒ /api/v1/auth/superadmin/logout
#21 27.00 ├ ƒ /api/v1/health
#21 27.00 ├ ƒ /api/v1/me/reservations
#21 27.00 ├ ƒ /api/v1/onboarding
#21 27.00 ├ ƒ /api/v1/r/[slug]
#21 27.00 ├ ƒ /api/v1/r/[slug]/availability
#21 27.00 ├ ƒ /api/v1/r/[slug]/calendar.ics
#21 27.00 ├ ƒ /api/v1/r/[slug]/reservations
#21 27.00 ├ ƒ /api/v1/r/[slug]/reservations/[id]
#21 27.00 ├ ƒ /api/v1/r/[slug]/reservations/[id]/cancel
#21 27.00 ├ ƒ /api/v1/r/[slug]/reservations/[id]/confirm
#21 27.00 ├ ƒ /api/v1/r/[slug]/waitlist
#21 27.00 ├ ƒ /api/v1/superadmin/stats
#21 27.00 ├ ƒ /api/v1/superadmin/tenants
#21 27.00 ├ ƒ /api/v1/superadmin/tenants/[id]
#21 27.00 ├ ƒ /api/v1/superadmin/tenants/[id]/feature-flags
#21 27.00 ├ ƒ /api/v1/superadmin/tenants/[id]/impersonate
#21 27.00 ├ ƒ /api/v1/superadmin/tenants/[id]/reactivate
#21 27.00 ├ ƒ /api/v1/superadmin/tenants/[id]/suspend
#21 27.00 ├ ƒ /api/v1/webhooks/mercadopago
#21 27.00 ├ ○ /me
#21 27.00 ├ ○ /onboarding
#21 27.00 ├ ƒ /r/[slug]
#21 27.00 ├ ƒ /r/[slug]/action-result
#21 27.00 ├ ƒ /r/[slug]/reservations/[id]/cancel
#21 27.00 ├ ○ /style-guide
#21 27.00 ├ ƒ /superadmin
#21 27.00 ├ ○ /superadmin/login
#21 27.00 └ ƒ /superadmin/tenants/[id]
#21 27.00 
#21 27.00 
#21 27.00 ○  (Static)   prerendered as static content
#21 27.00 ƒ  (Dynamic)  server-rendered on demand
#21 27.00 
#21 DONE 27.2s

#24 [migrate] exporting to image
#24 ...

#25 [app runner 4/7] RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
#25 CACHED

#26 [app runner 5/7] COPY --from=builder --chown=nextjs:nodejs /app/public ./public
#26 CACHED

#27 [app runner 6/7] COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
#27 DONE 0.5s

#24 [migrate] exporting to image
#24 ...

#28 [app runner 7/7] COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
#28 DONE 0.1s

#29 [app] exporting to image
#29 exporting layers
#29 exporting layers 1.7s done
#29 exporting manifest sha256:cfce68fae145f3a37d5884a5bff74a85d0e4c080627546fc8a3f602af49a7029 0.0s done
#29 exporting config sha256:73129f9f315834c2c414189d31a4080df264a709fb49c68f50314f8105a38699 0.0s done
#29 exporting attestation manifest sha256:79e5b4ac3928c4e3b24b0e45860781a159595e007a17b3e3e6fc9d887fca472c 0.0s done
#29 exporting manifest list sha256:0cf0c98b7d2f90613c4b5a4c8265e02bf4787dec434590ddeca3c1ffa9671bd9
#29 exporting manifest list sha256:0cf0c98b7d2f90613c4b5a4c8265e02bf4787dec434590ddeca3c1ffa9671bd9 0.0s done
#29 naming to ghcr.io/facundobruna/sistema-reservas-app:v0.1.0 done
#29 unpacking to ghcr.io/facundobruna/sistema-reservas-app:v0.1.0
#29 unpacking to ghcr.io/facundobruna/sistema-reservas-app:v0.1.0 1.0s done
#29 DONE 3.0s

#24 [migrate] exporting to image
#24 ...

#30 [app] resolving provenance for metadata file
#30 DONE 0.0s

#24 [migrate] exporting to image
#24 exporting layers 24.4s done
#24 exporting manifest sha256:f591d7e447da1e34003e54ab7197afd2a04318f852cac883c8f73e7480b41366 0.0s done
#24 exporting config sha256:48f1b43ba9f18ece389d519bc5875b7892c39ddd3422efae992a80a2f0c70d8a 0.0s done
#24 exporting attestation manifest sha256:2462120b1c08f891b2aaf94f89ec2455f40673c6d9980aa54d10752ffda715fa 0.0s done
#24 exporting manifest list sha256:c69d09455226dceaf6d766029039e43631418f8af79ff715df5b25ef46efcaa5
#24 exporting manifest list sha256:c69d09455226dceaf6d766029039e43631418f8af79ff715df5b25ef46efcaa5 0.0s done
#24 naming to ghcr.io/facundobruna/sistema-reservas-migrate:v0.1.0 done
#24 unpacking to ghcr.io/facundobruna/sistema-reservas-migrate:v0.1.0
#24 unpacking to ghcr.io/facundobruna/sistema-reservas-migrate:v0.1.0 14.2s done
#24 DONE 38.8s

#31 [migrate] resolving provenance for metadata file
#31 DONE 0.0s
[+] up 6/6
 ✔ Image ghcr.io/facundobruna/sistema-reservas-migrate:v0.1.0 Built                                                                                                            68.6s
 ✔ Image ghcr.io/facundobruna/sistema-reservas-app:v0.1.0     Built                                                                                                            68.6s
 ✔ Container sistema-reservas-db-1                            Healthy                                                                                                          8.5s
 ✔ Container sistema-reservas-migrate-1                       Exited                                                                                                           9.1s
 ✔ Container sistema-reservas-app-1                           Started                                                                                                          9.2s
PS C:\dev\Sistema-Reservas-Nuevo> 
Arranque en una máquina limpia siguiendo el README: `cp .env.example .env` y `docker compose up -d`.
Se ve el orden que impone el compose: Postgres arranca y queda `healthy`, el contenedor de
migraciones corre y termina, y recién ahí arranca la app.

![docker compose ps](img/tp2-compose-ps.png)

![la app funcionando end-to-end](img/tp2-app-funcionando.png)

Flujo completo contra el sistema contenerizado: reserva creada desde el wizard público y visible en
el panel del restaurante. Los datos viajan hasta Postgres, que corre en otro contenedor y al que la
app le habla por el nombre de servicio `db`.

### 2. Prueba de persistencia

> **Por qué esta evidencia va en texto y no en captura.** La prueba consiste en comparar la *misma
> fila* antes y después de destruir los contenedores, y lo que la identifica es el `id` (un UUID) y
> el `created_at`. En una captura de terminal esas columnas quedan cortadas o ilegibles, y son
> justamente el dato que prueba que la reserva es la misma y no una recreada. El enunciado admite
> "capturas **o salidas**": acá la salida es la evidencia más fuerte.

Secuencia ejecutada de corrido, con una reserva ya creada desde el wizard público. La consulta es
siempre la misma:

```sql
select id, party_size, starts_at, status, created_at from reservation order by created_at desc limit 3;
```

```text
=== 1. La reserva existe ===
                  id                  | party_size |       starts_at        |  status   |          created_at
--------------------------------------+------------+------------------------+-----------+-------------------------------
 b248894e-a09b-4a6c-ab75-ca0ca485d2ba |          4 | 2026-08-28 00:00:00+00 | confirmed | 2026-08-26 18:31:01.671761+00
(1 row)

=== 2. docker compose down ===
  Container sistema-reservas-app-1 Stopping

 Container sistema-reservas-app-1 Stopped
 Container sistema-reservas-app-1 Removing
 Container sistema-reservas-app-1 Removed
 Container sistema-reservas-migrate-1 Stopping
 Container sistema-reservas-migrate-1 Stopped
 Container sistema-reservas-migrate-1 Removing
 Container sistema-reservas-migrate-1 Removed
 Container sistema-reservas-db-1 Stopping
 Container sistema-reservas-db-1 Stopped
 Container sistema-reservas-db-1 Removing
 Container sistema-reservas-db-1 Removed
 Network sistema-reservas_default Removing
 Network sistema-reservas_default Removed
DRIVER    VOLUME NAME
local     sistema-reservas-nuevo_db_data
local     sistema-reservas_db_data
local     sistema-reservas_reservas-postgres-data
=== 3. up -d otra vez: la MISMA reserva sigue ahi ===
  Network sistema-reservas_default Creating

 Network sistema-reservas_default Created
 Container sistema-reservas-db-1 Creating
 Container sistema-reservas-db-1 Created
 Container sistema-reservas-migrate-1 Creating
 Container sistema-reservas-migrate-1 Created
 Container sistema-reservas-app-1 Creating
 Container sistema-reservas-app-1 Created
 Container sistema-reservas-db-1 Starting
 Container sistema-reservas-db-1 Started
 Container sistema-reservas-db-1 Waiting
 Container sistema-reservas-db-1 Healthy
 Container sistema-reservas-migrate-1 Starting
 Container sistema-reservas-migrate-1 Started
 Container sistema-reservas-db-1 Waiting
 Container sistema-reservas-migrate-1 Waiting
 Container sistema-reservas-db-1 Healthy
 Container sistema-reservas-migrate-1 Exited
 Container sistema-reservas-app-1 Starting
 Container sistema-reservas-app-1 Started
 Container sistema-reservas-migrate-1 Waiting
 Container sistema-reservas-app-1 Waiting
 Container sistema-reservas-db-1 Waiting
 Container sistema-reservas-migrate-1 Exited
 Container sistema-reservas-db-1 Healthy
 Container sistema-reservas-app-1 Healthy
                  id                  | party_size |       starts_at        |  status   |          created_at
--------------------------------------+------------+------------------------+-----------+-------------------------------
 b248894e-a09b-4a6c-ab75-ca0ca485d2ba |          4 | 2026-08-28 00:00:00+00 | confirmed | 2026-08-26 18:31:01.671761+00
(1 row)

=== 4. docker compose down -v: se lleva el volumen ===
  Container sistema-reservas-app-1 Stopping

 Container sistema-reservas-app-1 Stopped
 Container sistema-reservas-app-1 Removing
 Container sistema-reservas-app-1 Removed
 Container sistema-reservas-migrate-1 Stopping
 Container sistema-reservas-migrate-1 Stopped
 Container sistema-reservas-migrate-1 Removing
 Container sistema-reservas-migrate-1 Removed
 Container sistema-reservas-db-1 Stopping
 Container sistema-reservas-db-1 Stopped
 Container sistema-reservas-db-1 Removing
 Container sistema-reservas-db-1 Removed
 Volume sistema-reservas_db_data Removing
 Network sistema-reservas_default Removing
 Volume sistema-reservas_db_data Removed
 Network sistema-reservas_default Removed
DRIVER    VOLUME NAME
local     sistema-reservas-nuevo_db_data
local     sistema-reservas_reservas-postgres-data
=== 5. up -d: la base arranca vacia ===
  Network sistema-reservas_default Creating

 Network sistema-reservas_default Created
 Volume sistema-reservas_db_data Creating
 Volume sistema-reservas_db_data Created
 Container sistema-reservas-db-1 Creating
 Container sistema-reservas-db-1 Created
 Container sistema-reservas-migrate-1 Creating
 Container sistema-reservas-migrate-1 Created
 Container sistema-reservas-app-1 Creating
 Container sistema-reservas-app-1 Created
 Container sistema-reservas-db-1 Starting
 Container sistema-reservas-db-1 Started
 Container sistema-reservas-db-1 Waiting
 Container sistema-reservas-db-1 Healthy
 Container sistema-reservas-migrate-1 Starting
 Container sistema-reservas-migrate-1 Started
 Container sistema-reservas-migrate-1 Waiting
 Container sistema-reservas-db-1 Waiting
 Container sistema-reservas-db-1 Healthy
 Container sistema-reservas-migrate-1 Exited
 Container sistema-reservas-app-1 Starting
 Container sistema-reservas-app-1 Started
 Container sistema-reservas-app-1 Waiting
 Container sistema-reservas-db-1 Waiting
 Container sistema-reservas-migrate-1 Waiting
 Container sistema-reservas-db-1 Healthy
 Container sistema-reservas-migrate-1 Exited
 Container sistema-reservas-app-1 Healthy
 reservas
----------
        0
(1 row)
```

#### Cómo se lee esta salida

| Dónde mirar | Qué prueba |
|---|---|
| **Paso 1 vs. paso 3** — `b248894e-a09b-4a6c-ab75-ca0ca485d2ba`, creada `18:31:01.671761`, aparece **idéntica** en los dos | Es la misma fila. `docker compose down` destruyó el contenedor de la base y la reserva sobrevivió: los datos no viven en la capa escribible del contenedor sino en el volumen `db_data`. |
| **`docker volume ls` del paso 2** — `sistema-reservas_db_data` sigue listado después del `down` | El volumen es independiente del ciclo de vida del contenedor. Por eso `down` + `up -d` no pierde nada. |
| **`docker volume ls` del paso 4** — el volumen ya no aparece | La bandera `-v` de `docker compose down -v` es la que se lleva los volúmenes. Es la diferencia entre "apagar" y "borrar". |
| **Paso 5** — el `count` da `0` pero la consulta **no falla** | La tabla existe: al levantar sobre un volumen nuevo, el contenedor de migraciones se ejecutó de nuevo y recreó el esquema desde cero sobre una base virgen. Si las migraciones no hubieran corrido, `psql` habría contestado `relation "reservation" does not exist`. |

> Los otros dos volúmenes que aparecen en el listado (`sistema-reservas-nuevo_db_data` y
> `sistema-reservas_reservas-postgres-data`) son restos de iteraciones anteriores de este mismo
> trabajo, de cuando el compose todavía no declaraba un nombre de proyecto. No pertenecen a este
> sistema y no intervienen en la prueba: el único que aparece y desaparece es
> `sistema-reservas_db_data`.

> **Nota sobre la transcripción.** Se quitaron los bloques `NativeCommandError` que PowerShell
> intercala: Docker escribe su progreso por *stderr*, y PowerShell lo envuelve como si fuera un
> error aunque el comando termine bien. La salida de Docker y de `psql` está completa y sin editar.

**Qué persiste y qué no, en este sistema:** solo la base. Los contenedores de la app y de migraciones
no guardan estado a propósito — se pueden destruir y recrear sin perder nada, que es la condición
para poder desplegarlos en un entorno de QA o producción.

### 3. Tamaño de la imagen final contra la de build

![comparación de tamaños](img/tp2-tamanos.png)

Salida de `docker images` comparando la imagen final (`runner`) con la etapa de compilación
(`builder`). La diferencia es lo que el multi-stage deja afuera: pnpm, las devDependencies, el
código fuente y el toolchain de compilación. Solo la imagen chica es la que viaja al registry y la
que se va a desplegar.

### 4. Imágenes publicadas en el registry

![imágenes en ghcr.io](img/tp2-registry.png)

`sistema-reservas-app` y `sistema-reservas-migrate` publicadas en GitHub Container Registry con tag
`v0.1.0` y visibilidad pública.

![levantado desde el registry](img/tp2-registry-up.png)

`docker compose -f docker-compose.registry.yml up -d`: el sistema levantado bajando las imágenes en
vez de construirlas, que es lo que haría un entorno de QA o producción.
