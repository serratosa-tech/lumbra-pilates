-- =====================================================================
-- Pruebas de seguridad y de reglas de negocio
--
-- Pégalo entero en el editor SQL de Supabase y pulsa Run, después de las
-- migraciones (y, si quieres, del seed). Todo ocurre dentro de una
-- transacción que termina en ROLLBACK: no deja ningún rastro.
--
-- Simula cada tipo de usuario con «set local role» (anon / authenticated)
-- y request.jwt.claims (el «carné» que Supabase pone en cada petición).
-- Si algo falla, se para con un mensaje «FALLO <número>: …». Si todo va
-- bien, el resultado final es «TODAS LAS COMPROBACIONES SUPERADAS».
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Ayudantes (temporales: desaparecen al terminar)
-- ---------------------------------------------------------------------
create function pg_temp.check(p_label text, p_ok boolean)
returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'FALLO %', p_label;
  end if;
  raise notice 'OK  %', p_label;
end;
$$;

-- Ejecuta p_sql (con el rol activo en ese momento) y exige que falle con un error que contenga p_expected.
create function pg_temp.expect_error(p_label text, p_sql text, p_expected text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_expected || '%' then
      raise notice 'OK  %', p_label;
      return;
    end if;
    raise exception 'FALLO %: esperaba «%» y llegó «%»', p_label, p_expected, sqlerrm;
  end;
  raise exception 'FALLO %: esperaba el error «%» y no hubo error', p_label, p_expected;
end;
$$;

-- Entra como alguien: null = visitante anónimo. (security definer: lee auth.users sea cual sea el rol activo)
create function pg_temp.login(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if p_user_id is null then
    perform set_config('request.jwt.claims', '', true);
  else
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', p_user_id, 'role', 'authenticated',
      'email', (select email from auth.users where id = p_user_id))::text, true);
  end if;
end;
$$;

grant execute on function pg_temp.check(text, boolean), pg_temp.expect_error(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Preparación (como administrador)
-- ---------------------------------------------------------------------
insert into auth.users (id, email, encrypted_password) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'miembro.prueba@lumbra.example', 'hash-prueba-1'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'estudio-demo.prueba@lumbra.example', 'hash-prueba-2'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'no-miembro.prueba@lumbra.example', 'hash-prueba-3'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'cliente-demo.prueba@lumbra.example', 'hash-prueba-4'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'otra-clienta.prueba@lumbra.example', 'hash-prueba-5');

insert into public.studio_members (user_id, display_name, is_demo)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Miembro Prueba', false);
select private.register_demo_account('estudio-demo.prueba@lumbra.example', 'studio', 'Estudio Demo Prueba', null);
select private.register_demo_account('cliente-demo.prueba@lumbra.example', 'client', 'Clienta Demo Prueba', '+34 600 000 901');

insert into public.class_types (id, name, summary, level, intensity, duration_minutes, capacity)
values ('prueba-reformer', 'Reformer Prueba', 'Clase de prueba.', 'todos', 2, 50, 8);
insert into public.instructors (id, name, role, bio, initials)
values ('prueba-instructora', 'Instructora Prueba', 'Prueba', 'Prueba.', 'IP');

-- Clases de prueba (muy lejos en el futuro las que se editan, para no solaparse con el horario real).
insert into public.sessions (id, class_type_id, instructor_id, starts_at, duration_minutes, capacity) values
  ('bbbbbbbb-0000-4000-8000-000000000101', 'prueba-reformer', 'prueba-instructora', now() + interval '200 days', 50, 2),  -- aforo
  ('bbbbbbbb-0000-4000-8000-000000000102', 'prueba-reformer', 'prueba-instructora', now() + interval '1 hour', 50, 1),    -- empieza en 1 h
  ('bbbbbbbb-0000-4000-8000-000000000103', 'prueba-reformer', 'prueba-instructora', now() + interval '10 minutes', 50, 5), -- empieza en 10 min
  ('bbbbbbbb-0000-4000-8000-000000000104', 'prueba-reformer', 'prueba-instructora', now() + interval '1 day', 50, 10),     -- mañana
  ('bbbbbbbb-0000-4000-8000-000000000105', 'prueba-reformer', 'prueba-instructora', now() + interval '201 days', 50, 5),  -- se cancelará
  ('bbbbbbbb-0000-4000-8000-000000000106', 'prueba-reformer', 'prueba-instructora', now() + interval '202 days', 50, 5);  -- cuentas de cliente

-- =====================================================================
-- 11 · Permisos exactos (nada más queda expuesto)
-- =====================================================================
do $$
declare
  v_diff text;
begin
  with expected(grantee, object, privilege) as (values
    ('anon', 'public.class_types', 'SELECT'),
    ('anon', 'public.instructors', 'SELECT'),
    ('anon', 'public.sessions', 'SELECT'),
    ('authenticated', 'public.class_types', 'SELECT'),
    ('authenticated', 'public.class_types', 'INSERT'),
    ('authenticated', 'public.class_types', 'UPDATE'),
    ('authenticated', 'public.class_types', 'DELETE'),
    ('authenticated', 'public.instructors', 'SELECT'),
    ('authenticated', 'public.instructors', 'INSERT'),
    ('authenticated', 'public.instructors', 'UPDATE'),
    ('authenticated', 'public.instructors', 'DELETE'),
    ('authenticated', 'public.sessions', 'SELECT'),
    ('authenticated', 'public.bookings', 'SELECT'),
    ('authenticated', 'public.studio_members', 'SELECT')
  ),
  actual(grantee, object, privilege) as (
    select r.grantee, n.nspname || '.' || c.relname, p.privilege
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated')) as r(grantee)
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'))
      as p(privilege)
    where n.nspname in ('public', 'private')
      and c.relkind in ('r', 'v', 'm', 'p', 'f')
      and has_table_privilege(r.grantee, c.oid, p.privilege)
    union all
    select r.grantee, n.nspname || '.' || c.relname, p.privilege
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated')) as r(grantee)
    cross join (values ('USAGE'), ('SELECT'), ('UPDATE')) as p(privilege)
    where n.nspname in ('public', 'private')
      and c.relkind = 'S'
      and has_sequence_privilege(r.grantee, c.oid, p.privilege)
  )
  select string_agg(d.grantee || ' ' || d.privilege || ' ' || d.object, ', ') into v_diff
  from ((select * from actual except select * from expected)
        union all
        (select * from expected except select * from actual)) as d;
  perform pg_temp.check('11.1 permisos de tablas exactos' || coalesce(' (sobran o faltan: ' || v_diff || ')', ''),
                        v_diff is null);

  with public_rpc(name) as (values
    ('public.list_sessions'), ('public.get_session'), ('public.book_class'),
    ('public.find_booking'), ('public.cancel_booking'), ('public.health_check')
  ),
  expected(grantee, name) as (
    select 'anon', name from public_rpc
    union all select 'authenticated', name from public_rpc
    union all select 'authenticated', name from (values
      ('public.list_my_bookings'), ('public.cancel_my_booking'),
      ('public.create_session'), ('public.update_session'), ('public.cancel_session'),
      ('public.add_manual_booking'), ('public.cancel_booking_by_id'), ('public.set_attendance'),
      ('public.get_roster'), ('public.list_studio_bookings'),
      ('private.is_studio_member')) as f(name)
  ),
  actual(grantee, name) as (
    select r.grantee, n.nspname || '.' || p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) as r(grantee)
    where n.nspname in ('public', 'private')
      and has_function_privilege(r.grantee, p.oid, 'EXECUTE')
  )
  select string_agg(d.grantee || ' ' || d.name, ', ') into v_diff
  from ((select * from actual except select * from expected)
        union all
        (select * from expected except select * from actual)) as d;
  perform pg_temp.check('11.2 funciones ejecutables exactas' || coalesce(' (sobran o faltan: ' || v_diff || ')', ''),
                        v_diff is null);

  perform pg_temp.check('11.3 RLS activado en todas las tablas', not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private') and c.relkind = 'r' and not c.relrowsecurity));

  perform pg_temp.check('11.4 el visitante no puede entrar en el esquema private',
                        not has_schema_privilege('anon', 'private', 'USAGE'));
end;
$$;

-- =====================================================================
-- 3, 4 y 5 · Duplicados, aforo y lista de espera (como visitante)
-- =====================================================================
set local role anon;
select pg_temp.login(null);

do $$
declare
  v jsonb;
begin
  v := public.book_class('bbbbbbbb-0000-4000-8000-000000000101', 'Ana Prueba', 'ana.prueba@correo.example', '600 000 801');
  perform set_config('prueba.ana', v -> 'booking' ->> 'code', true);
  perform pg_temp.check('4.1 primera reserva confirmada', v -> 'booking' ->> 'status' = 'confirmed');
  perform pg_temp.check('4.2 datos normalizados', v -> 'booking' ->> 'phone' = '+34 600 000 801');

  v := public.book_class('bbbbbbbb-0000-4000-8000-000000000101', 'Bea Prueba', 'bea.prueba@correo.example', '600000802');
  perform set_config('prueba.bea', v -> 'booking' ->> 'code', true);
  perform pg_temp.check('4.3 segunda reserva confirmada', v -> 'booking' ->> 'status' = 'confirmed');

  v := public.book_class('bbbbbbbb-0000-4000-8000-000000000101', 'Carla Prueba', 'carla.prueba@correo.example', '600000803');
  perform set_config('prueba.carla', v -> 'booking' ->> 'code', true);
  perform pg_temp.check('4.4 con la clase llena, lista de espera (posición 1)',
                        v -> 'booking' ->> 'status' = 'waitlisted' and (v ->> 'waitlistPosition')::int = 1);

  v := public.book_class('bbbbbbbb-0000-4000-8000-000000000101', 'Dani Prueba', 'dani.prueba@correo.example', '600000804');
  perform set_config('prueba.dani', v -> 'booking' ->> 'code', true);
  perform pg_temp.check('4.5 siguiente en lista de espera (posición 2)', (v ->> 'waitlistPosition')::int = 2);

  v := public.get_session('bbbbbbbb-0000-4000-8000-000000000101');
  perform pg_temp.check('4.6 nunca más confirmadas que aforo (2 confirmadas, 2 esperando)',
                        (v ->> 'bookedCount')::int = 2 and (v ->> 'waitlistCount')::int = 2);
end;
$$;

select pg_temp.expect_error('3.1 mismo email con mayúsculas y espacios: duplicate',
  $q$ select public.book_class('bbbbbbbb-0000-4000-8000-000000000101', 'Otra', '  ANA.Prueba@Correo.Example ', '600000809') $q$,
  'duplicate');
select pg_temp.expect_error('3.2 también si la primera está en lista de espera: duplicate',
  $q$ select public.book_class('bbbbbbbb-0000-4000-8000-000000000101', 'Dani', 'dani.prueba@correo.example', '600000804') $q$,
  'duplicate');

do $$
declare
  v jsonb;
begin
  v := public.cancel_booking('bea.prueba@correo.example', current_setting('prueba.bea'));
  perform pg_temp.check('5.1 cancelar una confirmada avisa de que ha subido alguien',
                        v -> 'booking' ->> 'status' = 'cancelled' and (v ->> 'promoted')::boolean);
  perform pg_temp.check('5.2 la respuesta no trae datos de la persona que sube',
                        position('carla' in v::text) = 0);

  v := public.find_booking('carla.prueba@correo.example', current_setting('prueba.carla'));
  perform pg_temp.check('5.3 la primera de la lista sube sola con promotedAt',
                        v -> 'booking' ->> 'status' = 'confirmed' and v -> 'booking' ? 'promotedAt');

  v := public.find_booking('dani.prueba@correo.example', lower(replace(current_setting('prueba.dani'), '-', ' ')));
  perform pg_temp.check('5.4 la segunda pasa a la posición 1 (y el código se acepta en minúsculas)',
                        (v ->> 'waitlistPosition')::int = 1);

  v := public.book_class('bbbbbbbb-0000-4000-8000-000000000101', 'Bea Prueba', 'bea.prueba@correo.example', '600000802');
  perform set_config('prueba.bea2', v -> 'booking' ->> 'id', true);
  perform pg_temp.check('3.3 tras cancelar se puede volver a reservar', v -> 'booking' ->> 'status' = 'waitlisted');
end;
$$;

-- =====================================================================
-- 6 · Reglas de tiempo (como visitante)
-- =====================================================================
do $$
declare
  v jsonb;
begin
  v := public.book_class('bbbbbbbb-0000-4000-8000-000000000102', 'Eva Prueba', 'eva.prueba@correo.example', '600000805');
  perform set_config('prueba.eva', v -> 'booking' ->> 'code', true);
  perform pg_temp.check('6.1 reservar a menos de 2 h avisa de que no se podrá cancelar online',
                        v -> 'booking' ->> 'status' = 'confirmed' and not (v ->> 'canCancelOnline')::boolean);
  v := public.book_class('bbbbbbbb-0000-4000-8000-000000000102', 'Fran Prueba', 'fran.prueba@correo.example', '600000806');
  perform set_config('prueba.fran', v -> 'booking' ->> 'code', true);
end;
$$;

select pg_temp.expect_error('6.2 confirmada a menos de 2 h: too_late',
  format($q$ select public.cancel_booking('eva.prueba@correo.example', %L) $q$, current_setting('prueba.eva')),
  'too_late');
select pg_temp.check('6.3 en lista de espera sí se puede cancelar a menos de 2 h',
  public.cancel_booking('fran.prueba@correo.example', current_setting('prueba.fran')) -> 'booking' ->> 'status' = 'cancelled');

-- =====================================================================
-- 9 · Validación (como visitante)
-- =====================================================================
select pg_temp.expect_error('9.1 teléfono «123»: invalid_input',
  $q$ select public.book_class('bbbbbbbb-0000-4000-8000-000000000104', 'Gema Prueba', 'gema.prueba@correo.example', '123') $q$,
  'invalid_input');
select pg_temp.expect_error('9.2 nombre vacío: invalid_input',
  $q$ select public.book_class('bbbbbbbb-0000-4000-8000-000000000104', '   ', 'gema.prueba@correo.example', '600000807') $q$,
  'invalid_input');
select pg_temp.expect_error('9.3 email sin dominio: invalid_input',
  $q$ select public.book_class('bbbbbbbb-0000-4000-8000-000000000104', 'Gema Prueba', 'gema@', '600000807') $q$,
  'invalid_input');
select pg_temp.expect_error('9.4 clase que no existe: session_not_found',
  $q$ select public.book_class('bbbbbbbb-0000-4000-8000-000000000999', 'Gema Prueba', 'gema.prueba@correo.example', '600000807') $q$,
  'session_not_found');

-- =====================================================================
-- 8 · Límite de intentos con códigos erróneos (como visitante)
-- =====================================================================
do $$
begin
  for i in 1..5 loop
    perform pg_temp.check('8.' || i || ' código erróneo → null', public.find_booking('eva.prueba@correo.example', 'LUM-ZZZZ') is null);
  end loop;
end;
$$;
select pg_temp.expect_error('8.6 al sexto intento, too_many_attempts aunque el código sea bueno',
  format($q$ select public.find_booking('eva.prueba@correo.example', %L) $q$, current_setting('prueba.eva')),
  'too_many_attempts');
select pg_temp.expect_error('8.7 cancelar también queda bloqueado',
  format($q$ select public.cancel_booking('eva.prueba@correo.example', %L) $q$, current_setting('prueba.eva')),
  'too_many_attempts');

-- =====================================================================
-- 1 · El visitante anónimo no ve ni toca nada privado
-- =====================================================================
select pg_temp.expect_error('1.1 no lee reservas', 'select * from public.bookings', 'permission denied');
select pg_temp.expect_error('1.2 no lee miembros del estudio', 'select * from public.studio_members', 'permission denied');
select pg_temp.expect_error('1.3 no lee intentos', 'select * from public.lookup_attempts', 'permission denied');
select pg_temp.expect_error('1.4 no lee cuentas demo', 'select * from private.demo_accounts', 'permission denied');
select pg_temp.expect_error('1.5 no crea reservas directamente',
  $q$ insert into public.bookings (session_id, code, name, email, phone, status, source)
      values ('bbbbbbbb-0000-4000-8000-000000000104', 'LUM-AAAA', 'Ana', 'a@b.es', '+34 600 000 000', 'confirmed', 'web') $q$,
  'permission denied');
select pg_temp.expect_error('1.6 no edita reservas', $q$ update public.bookings set name = 'X' $q$, 'permission denied');
select pg_temp.expect_error('1.7 no borra reservas', 'delete from public.bookings', 'permission denied');
select pg_temp.expect_error('1.8 no edita clases', 'update public.sessions set capacity = 30', 'permission denied');
select pg_temp.expect_error('1.9 no borra clases', 'delete from public.sessions', 'permission denied');
select pg_temp.expect_error('1.10 no edita tipos de clase', $q$ update public.class_types set name = 'X' $q$, 'permission denied');
select pg_temp.expect_error('1.11 no borra instructoras', 'delete from public.instructors', 'permission denied');
select pg_temp.expect_error('1.12 no usa funciones del estudio',
  $q$ select public.cancel_session('bbbbbbbb-0000-4000-8000-000000000105') $q$, 'permission denied');
select pg_temp.expect_error('1.13 no ve rosters',
  $q$ select public.get_roster('bbbbbbbb-0000-4000-8000-000000000101') $q$, 'permission denied');
select pg_temp.expect_error('1.14 no usa funciones de cliente', 'select public.list_my_bookings()', 'permission denied');
select pg_temp.check('1.15 el horario público no contiene datos personales', not exists (
  select 1
  from jsonb_array_elements(public.list_sessions(now() - interval '7 days', now() + interval '30 days')) as e,
       jsonb_object_keys(e) as k
  where k not in ('id', 'classTypeId', 'instructorId', 'startsAt', 'durationMinutes', 'capacity', 'status',
                  'name', 'level', 'instructor', 'bookedCount', 'waitlistCount')));
select pg_temp.check('1.16 el horario público no contiene ningún email',
  position('@' in public.list_sessions(now() - interval '7 days', now() + interval '30 days')::text) = 0);
select pg_temp.check('1.17 con el código de otra persona y otro email no se ve nada',
  public.find_booking('ana.prueba@correo.example', current_setting('prueba.carla')) is null);
select pg_temp.check('1.18 la reserva propia solo trae los datos de esa persona',
  public.find_booking('ana.prueba@correo.example', current_setting('prueba.ana'))::text !~ '(carla|dani|bea)\.prueba');

-- =====================================================================
-- 2 · Un usuario con sesión que NO es del estudio tampoco puede
-- =====================================================================
reset role;
set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000003');

select pg_temp.check('2.1 solo ve sus propias reservas (ninguna)', (select count(*) from public.bookings) = 0);
select pg_temp.check('2.2 no ve miembros del estudio', (select count(*) from public.studio_members) = 0);
select pg_temp.expect_error('2.3 no lee intentos', 'select * from public.lookup_attempts', 'permission denied');
select pg_temp.expect_error('2.4 no edita clases', 'update public.sessions set capacity = 30', 'permission denied');
select pg_temp.expect_error('2.5 no borra clases', 'delete from public.sessions', 'permission denied');
select pg_temp.expect_error('2.6 no crea tipos de clase',
  $q$ insert into public.class_types (id, name, summary, level, intensity, duration_minutes, capacity)
      values ('intrusa', 'Intrusa', 'x', 'todos', 1, 50, 8) $q$,
  'row-level security');
update public.class_types set name = 'Cambiado' where id = 'prueba-reformer';
delete from public.instructors where id = 'prueba-instructora';
select pg_temp.expect_error('2.7 cancelar clase: unauthorized',
  $q$ select public.cancel_session('bbbbbbbb-0000-4000-8000-000000000105') $q$, 'unauthorized');
select pg_temp.expect_error('2.8 roster: unauthorized',
  $q$ select public.get_roster('bbbbbbbb-0000-4000-8000-000000000101') $q$, 'unauthorized');
select pg_temp.expect_error('2.9 reserva manual: unauthorized',
  $q$ select public.add_manual_booking('bbbbbbbb-0000-4000-8000-000000000104', 'X Prueba', 'x@correo.example', '600000808') $q$,
  'unauthorized');
select pg_temp.expect_error('2.10 cambiar aforo: unauthorized',
  $q$ select public.update_session('bbbbbbbb-0000-4000-8000-000000000101', 'prueba-reformer', 'prueba-instructora',
      now() + interval '200 days', 50, 30) $q$, 'unauthorized');
select pg_temp.expect_error('2.11 marcar asistencia: unauthorized',
  format($q$ select public.set_attendance(%L, 'attended') $q$, current_setting('prueba.bea2')), 'unauthorized');
select pg_temp.expect_error('2.12 reservas para métricas: unauthorized',
  $q$ select public.list_studio_bookings(now(), now() + interval '7 days') $q$, 'unauthorized');

reset role;
select pg_temp.check('2.13 los cambios silenciosos no han tocado nada (RLS)',
  (select name from public.class_types where id = 'prueba-reformer') = 'Reformer Prueba'
  and exists (select 1 from public.instructors where id = 'prueba-instructora'));

-- =====================================================================
-- 5 y 7 · Miembro del estudio: aforo, cancelar clase y asistencia
-- =====================================================================
set local role anon;
select pg_temp.login(null);
select set_config('prueba.hugo',
  public.book_class('bbbbbbbb-0000-4000-8000-000000000105', 'Hugo Prueba', 'hugo.prueba@correo.example', '600000810')
    -> 'booking' ->> 'code', true);
select set_config('prueba.ines',
  public.book_class('bbbbbbbb-0000-4000-8000-000000000103', 'Inés Prueba', 'ines.prueba@correo.example', '600000811')
    -> 'booking' ->> 'id', true);
select set_config('prueba.juan',
  public.book_class('bbbbbbbb-0000-4000-8000-000000000104', 'Juan Prueba', 'juan.prueba@correo.example', '600000812')
    -> 'booking' ->> 'id', true);

reset role;
set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000001');

select pg_temp.expect_error('5.5 aforo por debajo de las confirmadas: capacity_below_booked',
  $q$ select public.update_session('bbbbbbbb-0000-4000-8000-000000000101', 'prueba-reformer', 'prueba-instructora',
      now() + interval '200 days', 50, 1) $q$, 'capacity_below_booked');
do $$
declare
  v jsonb;
begin
  v := public.update_session('bbbbbbbb-0000-4000-8000-000000000101', 'prueba-reformer', 'prueba-instructora',
                             now() + interval '200 days', 50, 3);
  perform pg_temp.check('5.6 al subir el aforo sube sola la primera de la lista (Dani)',
                        jsonb_array_length(v -> 'promoted') = 1
                        and v -> 'promoted' -> 0 ->> 'email' = 'dani.prueba@correo.example');

  v := public.cancel_session('bbbbbbbb-0000-4000-8000-000000000105');
  perform pg_temp.check('7.1 cancelar la clase pasa sus reservas a class_cancelled',
                        jsonb_array_length(v) = 1 and v -> 0 ->> 'status' = 'class_cancelled');

  v := public.set_attendance(current_setting('prueba.ines')::uuid, 'attended');
  perform pg_temp.check('6.4 asistencia desde 30 min antes', v ->> 'attendance' = 'attended');
end;
$$;
select pg_temp.expect_error('6.5 asistencia antes de tiempo: attendance_too_early',
  format($q$ select public.set_attendance(%L, 'attended') $q$, current_setting('prueba.juan')), 'attendance_too_early');
select pg_temp.expect_error('6.6 asistencia de alguien en lista de espera: not_confirmed',
  format($q$ select public.set_attendance(%L, 'attended') $q$, current_setting('prueba.bea2')), 'not_confirmed');
select pg_temp.expect_error('5.7 dos clases a la vez en la sala: overlap',
  $q$ select public.create_session('prueba-reformer', 'prueba-instructora', now() + interval '200 days' + interval '20 minutes', 50, 8) $q$,
  'overlap');
select pg_temp.check('3.4 el miembro del estudio no lee la tabla de reservas directamente',
  (select count(*) from public.bookings) = 0);

reset role;
set local role anon;
select pg_temp.login(null);
select pg_temp.expect_error('7.2 reservar en una clase cancelada: class_cancelled',
  $q$ select public.book_class('bbbbbbbb-0000-4000-8000-000000000105', 'Lola Prueba', 'lola.prueba@correo.example', '600000813') $q$,
  'class_cancelled');
select pg_temp.check('7.3 la persona afectada ve su reserva cancelada por el estudio',
  public.find_booking('hugo.prueba@correo.example', current_setting('prueba.hugo')) -> 'booking' ->> 'status' = 'class_cancelled');

-- =====================================================================
-- 10 · Clientes con cuenta
-- =====================================================================
reset role;
set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000005');
select set_config('prueba.otra',
  public.book_class('bbbbbbbb-0000-4000-8000-000000000106', 'Otra Clienta', 'otro-email@correo.example', '600000814')
    -> 'booking' ->> 'id', true);

reset role;
select pg_temp.check('10.1 la reserva con sesión queda ligada a la cuenta y usa su email', exists (
  select 1 from public.bookings
  where id = current_setting('prueba.otra')::uuid
    and user_id = 'aaaaaaaa-0000-4000-8000-000000000005'
    and email = 'otra-clienta.prueba@lumbra.example'));

set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000004');
do $$
declare
  v jsonb;
begin
  v := public.book_class('bbbbbbbb-0000-4000-8000-000000000106', 'María Real', 'maria@gmail.com', '612 345 678');
  perform set_config('prueba.demo_cliente', v -> 'booking' ->> 'id', true);
  perform pg_temp.check('10.2 el cliente demo reserva siempre con sus datos de ejemplo',
                        v -> 'booking' ->> 'name' = 'Clienta Demo Prueba'
                        and v -> 'booking' ->> 'email' = 'cliente-demo.prueba@lumbra.example'
                        and v -> 'booking' ->> 'phone' = '+34 600 000 901');

  perform pg_temp.check('10.3 con select directo solo ve sus reservas',
    (select count(*) from public.bookings) > 0
    and not exists (select 1 from public.bookings where user_id is distinct from 'aaaaaaaa-0000-4000-8000-000000000004'));

  v := public.list_my_bookings();
  perform pg_temp.check('10.4 list_my_bookings solo devuelve las suyas', jsonb_array_length(v) > 0 and not exists (
    select 1 from jsonb_array_elements(v) as e
    where e -> 'booking' ->> 'email' <> 'cliente-demo.prueba@lumbra.example'));
end;
$$;
select pg_temp.expect_error('10.5 no puede cancelar la reserva de otra persona: not_found',
  format($q$ select public.cancel_my_booking(%L) $q$, current_setting('prueba.otra')), 'not_found');
select set_config('prueba.demo_pronto',
  public.book_class('bbbbbbbb-0000-4000-8000-000000000103', 'x', 'x', 'x') -> 'booking' ->> 'id', true);
select pg_temp.expect_error('10.6 la suya respeta las 2 horas: too_late',
  format($q$ select public.cancel_my_booking(%L) $q$, current_setting('prueba.demo_pronto')), 'too_late');
select pg_temp.check('10.7 y fuera de ese límite la puede cancelar',
  public.cancel_my_booking(current_setting('prueba.demo_cliente')::uuid) -> 'booking' ->> 'status' = 'cancelled');

reset role;
select pg_temp.check('10.8 ningún dato enviado por el cliente demo ha llegado a la tabla', not exists (
  select 1 from public.bookings
  where name = 'María Real' or email = 'maria@gmail.com' or phone = '+34 612 345 678'));
select pg_temp.check('10.9 la reserva de la otra clienta sigue intacta',
  (select status from public.bookings where id = current_setting('prueba.otra')::uuid) = 'confirmed');
-- Una reserva nueva del cliente demo para la prueba de enmascarado.
set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000004');
select public.book_class('bbbbbbbb-0000-4000-8000-000000000106', 'x', 'x', 'x');

-- =====================================================================
-- 12 · Enmascarado para la cuenta demo del estudio
-- =====================================================================
reset role;
set local role anon;
select pg_temp.login(null);
select set_config('prueba.maria',
  public.book_class('bbbbbbbb-0000-4000-8000-000000000104', 'María García', 'maria@gmail.com', '612 345 678')
    -> 'booking' ->> 'id', true);
select set_config('prueba.mario',
  public.book_class('bbbbbbbb-0000-4000-8000-000000000103', 'Mario Real', 'mario@gmail.com', '699 888 777')
    -> 'booking' ->> 'id', true);

reset role;
insert into public.bookings (session_id, code, name, email, phone, status, source, is_sample)
values ('bbbbbbbb-0000-4000-8000-000000000104', 'LUM-PRB2', 'Muestra Prueba', 'muestra.prueba@gmail.com',
        '+34 600 000 950', 'confirmed', 'web', true);

set local role authenticated;
select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000001');
select public.add_manual_booking('bbbbbbbb-0000-4000-8000-000000000104', 'Manual Prueba', 'manual.prueba@correo.example', '600 000 951');
select pg_temp.check('12.1 un miembro normal ve los datos completos', exists (
  select 1 from jsonb_array_elements(public.get_roster('bbbbbbbb-0000-4000-8000-000000000104') -> 'confirmed') as e
  where e ->> 'email' = 'maria@gmail.com' and e ->> 'phone' = '+34 612 345 678'));

select pg_temp.login('aaaaaaaa-0000-4000-8000-000000000002');
do $$
declare
  v jsonb;
begin
  v := public.get_roster('bbbbbbbb-0000-4000-8000-000000000104');
  perform pg_temp.check('12.2 la cuenta demo ve enmascarada una reserva web con email real', exists (
    select 1 from jsonb_array_elements(v -> 'confirmed') as e
    where e ->> 'name' = 'María García' and e ->> 'email' = 'm***@gmail.com' and e ->> 'phone' = '+34 6** *** *78'));
  perform pg_temp.check('12.3 ni rastro del email ni del teléfono reales en el roster',
    position('maria@gmail.com' in v::text) = 0 and position('612 345 678' in v::text) = 0);
  perform pg_temp.check('12.4 las reservas de ejemplo y las manuales .example se ven completas',
    exists (select 1 from jsonb_array_elements(v -> 'confirmed') as e where e ->> 'email' = 'muestra.prueba@gmail.com')
    and exists (select 1 from jsonb_array_elements(v -> 'confirmed') as e where e ->> 'email' = 'manual.prueba@correo.example'));

  v := public.get_roster('bbbbbbbb-0000-4000-8000-000000000106');
  perform pg_temp.check('12.5 también se enmascara lo escrito con la cuenta de cliente demo', exists (
    select 1 from jsonb_array_elements(v -> 'confirmed') as e
    where e ->> 'name' = 'Clienta Demo Prueba' and e ->> 'email' = 'c***@lumbra.example'));

  v := public.list_studio_bookings(now(), now() + interval '3 days');
  perform pg_temp.check('12.6 las reservas para métricas también van enmascaradas',
    jsonb_array_length(v) > 0 and position('maria@gmail.com' in v::text) = 0 and position('mario@gmail.com' in v::text) = 0);

  v := public.set_attendance(current_setting('prueba.mario')::uuid, 'no_show');
  perform pg_temp.check('12.7 marcar asistencia devuelve la reserva enmascarada',
    v ->> 'email' = 'm***@gmail.com' and v ->> 'phone' = '+34 6** *** *77');

  v := public.cancel_booking_by_id(current_setting('prueba.maria')::uuid);
  perform pg_temp.check('12.8 cancelar desde el panel devuelve la reserva enmascarada',
    v -> 'booking' ->> 'email' = 'm***@gmail.com' and v -> 'booking' ->> 'status' = 'cancelled');

  perform pg_temp.check('12.9 la cuenta demo no puede leer la tabla de reservas',
    (select count(*) from public.bookings) = 0);
end;
$$;

-- =====================================================================
-- 13 · Blindaje de las cuentas demo (trigger en auth.users)
-- =====================================================================
reset role;
select pg_temp.expect_error('13.1 no se puede cambiar el email',
  $q$ update auth.users set email = 'otra@gmail.com' where id = 'aaaaaaaa-0000-4000-8000-000000000004' $q$,
  'La cuenta demo no puede');
select pg_temp.expect_error('13.2 no se puede cambiar la contraseña',
  $q$ update auth.users set encrypted_password = 'otra' where id = 'aaaaaaaa-0000-4000-8000-000000000002' $q$,
  'La cuenta demo no puede');
select pg_temp.expect_error('13.3 no se puede pedir un cambio de email',
  $q$ update auth.users set email_change = 'otra@gmail.com' where id = 'aaaaaaaa-0000-4000-8000-000000000004' $q$,
  'La cuenta demo no puede');
select pg_temp.expect_error('13.4 no se puede borrar',
  $q$ delete from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000004' $q$,
  'no se puede borrar');
update auth.users set last_sign_in_at = now() where id = 'aaaaaaaa-0000-4000-8000-000000000004';
select pg_temp.check('13.5 iniciar sesión (actualiza last_sign_in_at) sigue funcionando',
  (select last_sign_in_at from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000004') = now());
update auth.users set email = 'cambiado.prueba@lumbra.example' where id = 'aaaaaaaa-0000-4000-8000-000000000003';
select pg_temp.check('13.6 las cuentas que no son demo se cambian sin problema',
  (select email from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000003') = 'cambiado.prueba@lumbra.example');
select set_config('lumbra.restoring', 'on', true);
update auth.users set encrypted_password = 'roto' where id = 'aaaaaaaa-0000-4000-8000-000000000004';
select set_config('lumbra.restoring', 'off', true);
select private.restore_demo_accounts();
select pg_temp.check('13.7 la restauración devuelve la contraseña a su copia',
  (select encrypted_password from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000004') = 'hash-prueba-4');

-- =====================================================================
-- 14 · health_check no expone datos
-- =====================================================================
set local role anon;
select pg_temp.login(null);
select pg_temp.check('14.1 health_check responde y solo trae ok y checked_at',
  (select array_agg(k order by k) from jsonb_object_keys(public.health_check()) as k) = array['checked_at', 'ok']
  and (public.health_check() ->> 'ok')::boolean);

reset role;
rollback;

select 'TODAS LAS COMPROBACIONES SUPERADAS' as resultado;
