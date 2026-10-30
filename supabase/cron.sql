-- =====================================================================
-- Tareas programadas de la demo (opcional; requiere haber ejecutado seed.sql)
--
-- pg_cron es un programador de tareas dentro de Postgres. En Supabase
-- trabaja en hora UTC, así que la tarea se ejecuta cada hora en punto y
-- private.demo_hourly() decide según la hora de Madrid:
--   · a las 03:00 (Madrid) → reset_demo(): borra reservas y clases y vuelve a sembrar
--   · el resto de horas    → restore_demo(): repone cuentas demo, catálogo y reservas de ejemplo
-- =====================================================================

-- Si ya la activaste desde el panel (Integrations → Cron), esta línea no hace nada.
create extension if not exists pg_cron with schema pg_catalog;

-- Si ya existe una tarea con este nombre, cron.schedule la actualiza en lugar de duplicarla.
select cron.schedule('lumbra-demo', '0 * * * *', 'select private.demo_hourly()');

-- Para comprobarla:        select jobname, schedule, command, active from cron.job;
-- Últimas ejecuciones:     select status, return_message, start_time from cron.job_run_details
--                          order by start_time desc limit 10;
-- Para quitarla:           select cron.unschedule('lumbra-demo');
