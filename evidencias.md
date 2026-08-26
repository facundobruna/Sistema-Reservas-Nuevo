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

Arranque en una máquina limpia siguiendo el README: `cp .env.example .env` y `docker compose up -d`.
Se ve el orden que impone el compose: Postgres arranca y queda `healthy`, el contenedor de
migraciones corre y termina, y recién ahí arranca la app.

![docker compose ps](img/tp2-compose-ps.png)

![la app funcionando end-to-end](img/tp2-app-funcionando.png)

Flujo completo contra el sistema contenerizado: reserva creada desde el wizard público y visible en
el panel del restaurante. Los datos viajan hasta Postgres, que corre en otro contenedor y al que la
app le habla por el nombre de servicio `db`.

### 2. Prueba de persistencia

![down y up conservan los datos](img/tp2-persistencia-down-up.png)

`docker compose down` seguido de `docker compose up -d`: la reserva sigue ahí. Los datos no viven en
la capa escribible del contenedor sino en el volumen `db_data`, que sobrevive a que el contenedor se
destruya.

![down -v borra los datos](img/tp2-persistencia-down-v.png)

`docker compose down -v`: la `-v` se lleva el volumen. Al volver a levantar, la base arranca vacía y
las migraciones se aplican de nuevo sobre un esquema limpio.

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
