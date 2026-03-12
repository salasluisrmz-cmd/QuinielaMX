# Resultados automáticos desde ESPN

Los resultados reales de cada partido se obtienen de **ESPN** (la misma fuente que usas para las jornadas: ESPN / TUDN / RÉCORD). Así la app puede marcar en **verde** los pronósticos acertados y calcular aciertos.

## Cómo funciona

1. **Tabla en Supabase**  
   La tabla `resultados` guarda, por partido y jornada, el resultado real: `"1"` (gana local), `"X"` (empate) o `"2"` (gana visitante).

2. **API de ESPN**  
   Se usa la API no documentada de ESPN para Liga MX (mex.1):
   - `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=YYYYMMDD`
   - No requiere API key.
   - Cuando un partido termina, su `status.type.state` pasa a `"post"` y trae los goles.

3. **Edge Function `sync-resultados`**  
   - Consulta ESPN para los días de la jornada (ej. 13, 14 y 15 de marzo para J11).
   - Toma solo partidos ya finalizados.
   - Convierte goles local/visitante a 1 / X / 2.
   - Relaciona cada partido de ESPN con tu `partido_id` (por nombres de equipos).
   - Hace **upsert** en la tabla `resultados` en Supabase (con service role).

4. **En la app**  
   - Los resultados se **leen desde Supabase** (tabla `resultados`).
   - El botón **«Actualizar resultados desde ESPN»** (en la pantalla de pronósticos enviados) llama a la Edge Function y luego vuelve a cargar los resultados. Así se marcan en verde los aciertos.

## Qué tienes que hacer

1. **Crear la tabla**  
   Ejecuta la migración en tu proyecto Supabase:
   - Con CLI: `npx supabase db push` (o `supabase db push` si tienes la CLI instalada).
   - Sin CLI: en el **Dashboard de Supabase** → **SQL Editor** → pega y ejecuta el SQL de `supabase/migrations/20260310000000_create_resultados.sql`.
   - Para añadir columnas de goles: ejecuta también el SQL de `supabase/migrations/20260310100000_add_goles_to_resultados.sql` en el SQL Editor.

2. **Desplegar la Edge Function**  
   ```bash
   npx supabase functions deploy sync-resultados
   ```
   El proyecto incluye `supabase/config.toml` con `verify_jwt = false` para esta función (así no da 401 con la anon key).  
   **Si sigues teniendo 401:** en el Dashboard de Supabase → **Edge Functions** → **sync-resultados** → desactiva **"Enforce JWT verification"**.

3. **Actualizar resultados**  
   - **A mano:** cuando termine la jornada, en la app entra a «Ver pronósticos completos» y pulsa **«Actualizar resultados desde ESPN»**.
   - **Automático (opcional):** programa un cron (por ejemplo en Supabase o en GitHub Actions) que haga `POST` a tu función `sync-resultados` cada cierto tiempo (ej. cada hora el domingo por la noche) para que los resultados se actualicen solos cuando ESPN los publique.

## Resumen

- **Origen de los resultados:** API de ESPN (Liga MX, mex.1), misma lógica que para llenar las jornadas.
- **Dónde se guardan:** tabla `resultados` en Supabase.
- **Cuándo se actualizan:** al pulsar el botón en la app o cuando se ejecute la Edge Function (cron o manual).
