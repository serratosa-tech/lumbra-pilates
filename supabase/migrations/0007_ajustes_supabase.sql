-- =====================================================================
-- 0007 · Ajustes del proyecto Supabase
--
-- 1. Al activar «Enable automatic RLS», Supabase crea la función
--    public.rls_auto_enable() y un event trigger que la ejecuta cada vez
--    que se crea una tabla. Al vivir en public, anon y authenticated
--    podían ejecutarla. Se les retira ese permiso. El event trigger sigue
--    funcionando: Postgres lo ejecuta por su cuenta y no comprueba
--    EXECUTE de quien crea la tabla.
--    En proyectos sin ese ajuste la función no existe y este paso no hace nada.
--
-- 2. RLS en private.demo_accounts, escrito de forma explícita. Ya lo activa
--    0002, pero al pegar 0001 el editor avisa de que la tabla aún no lo tiene
--    («Run and enable RLS»). Repetirlo aquí deja el repositorio igual que el
--    proyecto, se haya elegido lo que se haya elegido en ese aviso.
-- =====================================================================

do $$
declare
  v_owner text;
begin
  if to_regprocedure('public.rls_auto_enable()') is null then
    raise notice 'public.rls_auto_enable() no existe en este proyecto: nada que ajustar.';
    return;
  end if;

  execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';

  -- REVOKE no da error si quien lo ejecuta no es el dueño: solo avisa y no cambia nada.
  -- Por eso se comprueba el resultado.
  if has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') then
    select pg_get_userbyid(proowner) into v_owner from pg_proc where oid = 'public.rls_auto_enable()'::regprocedure;
    raise exception 'No se ha podido retirar EXECUTE sobre public.rls_auto_enable() (su dueño es %). Ver supabase/README.md, apartado 4.', v_owner;
  end if;
end;
$$;

alter table private.demo_accounts enable row level security;
