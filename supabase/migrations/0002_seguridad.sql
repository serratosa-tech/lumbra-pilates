-- =====================================================================
-- 0002 · Seguridad
-- Doble barrera:
--   1. GRANT: ¿puede este rol tocar la tabla? (si no, «permission denied»)
--   2. RLS (Row Level Security): de lo que puede tocar, ¿qué filas?
--
-- Roles de Supabase:
--   anon          visitante sin sesión (la app usa la clave publishable)
--   authenticated cualquiera con sesión iniciada (cliente o estudio)
-- Ser «authenticated» no basta para gestionar: hay que estar en studio_members.
--
-- El proyecto tiene «Automatically expose new tables» desactivado, así que
-- las tablas nuevas no dan permiso a nadie. Aun así se revoca todo antes de
-- conceder, para que el resultado sea el mismo en cualquier proyecto.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ¿Quien llama es miembro del estudio?
-- security definer: se ejecuta con los permisos de su dueño, así puede leer
-- studio_members aunque quien llama no pueda. search_path vacío: todo va
-- con su esquema escrito, para que nadie pueda colar otra tabla con el mismo nombre.
-- ---------------------------------------------------------------------
create function private.is_studio_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.studio_members where user_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------
-- RLS activado en todas las tablas (sin política = nadie ve ninguna fila)
-- ---------------------------------------------------------------------
alter table public.class_types     enable row level security;
alter table public.instructors     enable row level security;
alter table public.sessions        enable row level security;
alter table public.bookings        enable row level security;
alter table public.studio_members  enable row level security;
alter table public.lookup_attempts enable row level security;
alter table private.demo_accounts  enable row level security;

-- ---------------------------------------------------------------------
-- Permisos (GRANT): primero se quita todo, luego se da solo lo necesario
-- ---------------------------------------------------------------------
revoke all on table
  public.class_types, public.instructors, public.sessions, public.bookings,
  public.studio_members, public.lookup_attempts
from public, anon, authenticated;
revoke all on table private.demo_accounts from public, anon, authenticated;
revoke all on sequence public.lookup_attempts_id_seq from public, anon, authenticated;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

-- El horario es público: tipos, instructoras y clases no tienen datos personales.
grant select on table public.class_types, public.instructors, public.sessions to anon, authenticated;
-- El estudio mantiene el catálogo directamente (las políticas de abajo limitan a miembros).
grant insert, update, delete on table public.class_types, public.instructors to authenticated;
-- Cada cliente con cuenta ve sus reservas; cada miembro, su propia fila de miembro.
grant select on table public.bookings, public.studio_members to authenticated;
-- lookup_attempts y private.*: sin permisos. Solo las tocan las funciones.

-- Las políticas usan is_studio_member(), así que authenticated necesita poder llamarla.
-- El esquema private no está expuesto por la API: esto no la hace accesible desde fuera.
grant usage on schema private to authenticated;
revoke all on function private.is_studio_member() from public, anon, authenticated;
grant execute on function private.is_studio_member() to authenticated;

-- ---------------------------------------------------------------------
-- Políticas
-- «(select …)» hace que Postgres evalúe la función una vez por consulta, no por fila.
-- ---------------------------------------------------------------------

-- Tipos de clase: todos leen, solo el estudio escribe.
create policy "Tipos de clase visibles para todos" on public.class_types
  for select to anon, authenticated using (true);
create policy "El estudio crea tipos de clase" on public.class_types
  for insert to authenticated with check ((select private.is_studio_member()));
create policy "El estudio edita tipos de clase" on public.class_types
  for update to authenticated
  using ((select private.is_studio_member())) with check ((select private.is_studio_member()));
create policy "El estudio borra tipos de clase" on public.class_types
  for delete to authenticated using ((select private.is_studio_member()));

-- Instructoras: igual.
create policy "Instructoras visibles para todos" on public.instructors
  for select to anon, authenticated using (true);
create policy "El estudio crea instructoras" on public.instructors
  for insert to authenticated with check ((select private.is_studio_member()));
create policy "El estudio edita instructoras" on public.instructors
  for update to authenticated
  using ((select private.is_studio_member())) with check ((select private.is_studio_member()));
create policy "El estudio borra instructoras" on public.instructors
  for delete to authenticated using ((select private.is_studio_member()));

-- Clases: todos leen. Se crean, editan y cancelan solo con las funciones del estudio,
-- para que nadie se salte el aforo, los solapes ni la lista de espera.
create policy "Clases visibles para todos" on public.sessions
  for select to anon, authenticated using (true);

-- Reservas: cada cliente con cuenta ve solo las suyas. No hay política para el estudio:
-- el panel las lee con funciones, que enmascaran los datos si la cuenta es la demo.
create policy "Cada cliente ve sus reservas" on public.bookings
  for select to authenticated using (user_id = (select auth.uid()));

-- Miembros: cada uno ve solo su propia fila (así la app sabe si es del estudio).
-- Las altas se hacen desde el editor SQL de Supabase, nunca desde la app.
create policy "Cada miembro ve su fila" on public.studio_members
  for select to authenticated using (user_id = (select auth.uid()));

-- lookup_attempts y private.demo_accounts: sin políticas (nadie ve nada).
