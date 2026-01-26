# Convenciones de Commits (GATIC)

Objetivo: que cada commit sea **auto-explicativo**, f├ícil de auditar y ├║til para volver atr├ís sin abrir mil archivos.

## Formato

Usamos un formato tipo Conventional Commits + cuerpo ÔÇ£tipo reporteÔÇØ:

```
tipo(scope): resumen corto en presente/imperativo

DESCRIPCI├ôN DETALLADA:
=====================
...

PROCESO DE IMPLEMENTACI├ôN Y PRUEBAS:
====================================
1. ...
2. ...

ARCHIVOS MODIFICADOS:
=====================
path/archivo.ext
  - qu├® cambi├│

NOTAS T├ëCNICAS:
===============
- decisiones/edge cases

VERIFICACI├ôN:
=============
- qu├® se ejecut├│ para validar (o "no ejecutado")
```

### `tipo` (elige uno)

- `feat`: nueva funcionalidad
- `fix`: correcci├│n de bug
- `docs`: documentaci├│n
- `chore`: mantenimiento / setup / tareas no funcionales
- `refactor`: refactor sin cambiar comportamiento
- `test`: tests
- `ci`: CI/CD
- `build`: dependencias/build tooling

### `scope` (recomendado)

Usa un scope corto y consistente, por ejemplo:

- `init`, `bmad`, `docs`
- `gate0`, `gate1`, ... `gate5`
- `auth`, `rbac`, `inventory`, `assets`, `loans`, `locks`, `audit`, `attachments`, `trash`

### Resumen (subject)

- 1 l├¡nea, clara y espec├¡fica.
- Si aplica, menciona Gate o Issue: `gate0`, `#123`, etc.

## Reglas pr├ícticas

- Si NO hubo pruebas, se escribe expl├¡cito en `VERIFICACI├ôN:` (ej. ÔÇ£no ejecutadoÔÇØ).
- Si el cambio es grande, dividir en commits por intenci├│n (no por archivos).
- Evitar meter credenciales/configs locales (ver `.gitignore`).

## Ejemplo (realista)

```
feat(gate4): locks de concurrencia en tareas pendientes

DESCRIPCI├ôN DETALLADA:
=====================
Se implementa claim/lock a nivel de tarea pendiente para evitar que dos editores
procesen la misma tarea simult├íneamente.

PROCESO DE IMPLEMENTACI├ôN Y PRUEBAS:
====================================
1. MODELO
   - Se agregaron campos locked_by/heartbeat/ttl
2. REGLAS
   - Claim al entrar a "Procesar"
   - Read-only para otros usuarios
3. PRUEBAS
   - Se prob├│ con 2 usuarios en paralelo

ARCHIVOS MODIFICADOS:
=====================
app/...
database/...

NOTAS T├ëCNICAS:
===============
- TTL 3 min + timeout rolling 15 min (ver project-context)

VERIFICACI├ôN:
=============
- phpunit
```

