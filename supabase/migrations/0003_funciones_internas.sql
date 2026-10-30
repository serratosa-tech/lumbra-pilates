-- =====================================================================
-- 0003 · Funciones internas (esquema private, no expuestas por la API)
-- Son las piezas que comparten las funciones públicas, las de cliente y
-- las del estudio. Replican src/data/logic (validation.ts, codes.ts,
-- state.ts y booking.ts).
--
-- Los errores de negocio se lanzan con el mismo código estable que usa
-- la app (src/data/errors.ts): «raise exception 'duplicate'» llega a la
-- app como un error cuyo mensaje es «duplicate».
-- =====================================================================

-- ---------------------------------------------------------------------
-- Normalización y validación (validation.ts, codes.ts)
-- ---------------------------------------------------------------------

create function private.normalize_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(coalesce(p_email, '')));
$$;

create function private.normalize_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(btrim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
$$;

-- Al menos 2 caracteres, alguna letra y como mucho 80.
create function private.is_valid_name(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select char_length(btrim(coalesce(p_name, ''))) between 2 and 80
     and btrim(coalesce(p_name, '')) ~ '[[:alpha:]]';
$$;

-- nombre@dominio.tld (tld de 2 o más), y como mucho 254 caracteres.
create function private.is_valid_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select char_length(btrim(coalesce(p_email, ''))) between 1 and 254
     and btrim(coalesce(p_email, '')) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$';
$$;

-- Teléfono español (móvil o fijo, con o sin +34 / 0034) como «+34 612 345 678»; null si no es válido.
create function private.normalize_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_digits text := regexp_replace(btrim(coalesce(p_phone, '')), '[[:space:]().-]', '', 'g');
begin
  if v_digits like '+34%' then
    v_digits := substr(v_digits, 4);
  elsif v_digits like '0034%' then
    v_digits := substr(v_digits, 5);
  end if;
  if v_digits !~ '^[6789][0-9]{8}$' then
    return null;
  end if;
  return '+34 ' || substr(v_digits, 1, 3) || ' ' || substr(v_digits, 4, 3) || ' ' || substr(v_digits, 7, 3);
end;
$$;

-- Acepta «lum-7k3q», «LUM 7K3Q», «lum7k3q» o solo «7K3Q» y devuelve «LUM-7K3Q».
create function private.normalize_code(p_code text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_compact text := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
begin
  if v_compact like 'LUM%' and char_length(v_compact) > 4 then
    v_compact := substr(v_compact, 4);
  end if;
  return 'LUM-' || v_compact;
end;
$$;

-- Código de reserva legible y único, sin caracteres ambiguos (0/O, 1/I/L).
-- La aleatoriedad sale de gen_random_uuid(), que usa el generador criptográfico de Postgres.
create function private.generate_booking_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  v_offset integer;
begin
  for v_attempt in 1..1000 loop
    v_bytes := uuid_send(gen_random_uuid());
    v_code := 'LUM-';
    -- Bytes completamente aleatorios del UUID v4 (el 6 y el 8 llevan bits fijos de versión).
    foreach v_offset in array array[0, 2, 4, 10] loop
      v_code := v_code || substr(
        v_alphabet,
        ((get_byte(v_bytes, v_offset) * 256 + get_byte(v_bytes, v_offset + 1)) % 31) + 1,
        1
      );
    end loop;
    if not exists (select 1 from public.bookings where code = v_code) then
      return v_code;
    end if;
  end loop;
  raise exception 'No se ha podido generar un código de reserva libre.';
end;
$$;

-- Hash para guardar emails e IPs de los intentos fallidos sin guardarlos en claro.
create function private.hash_text(p_value text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(p_value, 'UTF8'));
$$;

-- Fecha en el mismo formato que toISOString() de JavaScript: «2026-11-02T17:00:00.000Z».
create function private.iso(p_value timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_value at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- ---------------------------------------------------------------------
-- Quién llama
-- ---------------------------------------------------------------------

create function private.is_demo_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.studio_members where user_id = (select auth.uid()) and is_demo
  );
$$;

create function private.require_studio_member()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_studio_member() then
    raise exception 'unauthorized';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Enmascarado para la cuenta demo del estudio
-- ---------------------------------------------------------------------

-- «maria@gmail.com» → «m***@gmail.com»
create function private.mask_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(p_email, 1) || '***@' || split_part(p_email, '@', 2);
$$;

-- «+34 612 345 678» → «+34 6** *** *78»
create function private.mask_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '+34 ' || substr(p_phone, 5, 1) || '** *** *' || right(p_phone, 2);
$$;

-- ---------------------------------------------------------------------
-- Representación JSON (mismos nombres de campo que src/data/types.ts)
-- ---------------------------------------------------------------------

-- ClassSession: la clase con su tipo, su instructora y las plazas ocupadas (solo números).
create function private.session_json(p_session public.sessions)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_session.id,
    'classTypeId', p_session.class_type_id,
    'instructorId', p_session.instructor_id,
    'startsAt', private.iso(p_session.starts_at),
    'durationMinutes', p_session.duration_minutes,
    'capacity', p_session.capacity,
    'status', p_session.status,
    'name', coalesce(ct.name, 'Clase'),
    'level', coalesce(ct.level, 'todos'),
    'instructor', coalesce(i.name, 'Por confirmar'),
    'bookedCount', (select count(*) from public.bookings b
                    where b.session_id = p_session.id and b.status = 'confirmed'),
    'waitlistCount', (select count(*) from public.bookings b
                      where b.session_id = p_session.id and b.status = 'waitlisted')
  )
  from (select 1) as one
  left join public.class_types ct on ct.id = p_session.class_type_id
  left join public.instructors i on i.id = p_session.instructor_id;
$$;

-- Booking. Solo se devuelve a su dueña (por email + código o por su cuenta) o al estudio.
create function private.booking_json(p_booking public.bookings)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_booking.id,
    'code', p_booking.code,
    'sessionId', p_booking.session_id,
    'name', p_booking.name,
    'email', p_booking.email,
    'phone', p_booking.phone,
    'status', p_booking.status,
    'source', p_booking.source,
    'createdAt', private.iso(p_booking.created_at),
    'attendance', p_booking.attendance
  )
  || case when p_booking.cancelled_at is null then '{}'::jsonb
          else jsonb_build_object('cancelledAt', private.iso(p_booking.cancelled_at)) end
  || case when p_booking.promoted_at is null then '{}'::jsonb
          else jsonb_build_object('promotedAt', private.iso(p_booking.promoted_at)) end;
$$;

-- Booking tal como lo ve el panel. Si quien mira es la cuenta demo del estudio (contraseña
-- pública), se enmascaran email y teléfono de toda reserva que haya escrito un visitante:
-- no es de ejemplo y, o bien su email no es .example, o bien la hizo una cuenta demo.
create function private.studio_booking_json(p_booking public.bookings)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_json jsonb := private.booking_json(p_booking);
begin
  if private.is_demo_member()
     and not p_booking.is_sample
     and (
       p_booking.email not like '%.example'
       or exists (select 1 from private.demo_accounts d where d.user_id = p_booking.user_id)
     )
  then
    v_json := v_json || jsonb_build_object(
      'email', private.mask_email(p_booking.email),
      'phone', private.mask_phone(p_booking.phone)
    );
  end if;
  return v_json;
end;
$$;

-- ---------------------------------------------------------------------
-- Lista de espera (state.ts, booking.ts)
-- ---------------------------------------------------------------------

-- Posición en la lista de espera (desde 1), o null si la reserva no está esperando.
create function private.waitlist_position(p_booking public.bookings)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_booking.status <> 'waitlisted' then null else (
    select count(*)::integer from public.bookings b
    where b.session_id = p_booking.session_id
      and b.status = 'waitlisted'
      and (b.created_at, b.id) <= (p_booking.created_at, p_booking.id)
  ) end;
$$;

-- BookingDetails: la reserva, su clase, su posición y hasta cuándo se puede cancelar online.
-- can_cancel_online = false es el aviso de «faltan menos de 2 horas».
create function private.booking_details_json(p_booking public.bookings, p_for_studio boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'booking', case when p_for_studio then private.studio_booking_json(p_booking)
                    else private.booking_json(p_booking) end,
    'session', private.session_json(s),
    'waitlistPosition', private.waitlist_position(p_booking),
    'cancellableUntil', private.iso(s.starts_at - interval '2 hours'),
    'canCancelOnline', now() <= s.starts_at - interval '2 hours'
  )
  from public.sessions s
  where s.id = p_booking.session_id;
$$;

-- Sube de la lista de espera, por orden de llegada, tantas personas como plazas libres haya.
-- Quien la llama ya tiene bloqueada la fila de la clase.
create function private.promote_waitlist(p_session_id uuid)
returns setof public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_free integer;
begin
  select * into v_session from public.sessions where id = p_session_id;
  if not found or v_session.status = 'cancelled' then
    return;
  end if;

  v_free := v_session.capacity
    - (select count(*) from public.bookings where session_id = p_session_id and status = 'confirmed');
  if v_free <= 0 then
    return;
  end if;

  return query
    update public.bookings b
    set status = 'confirmed', promoted_at = now()
    where b.id in (
      select w.id from public.bookings w
      where w.session_id = p_session_id and w.status = 'waitlisted'
      order by w.created_at, w.id
      limit v_free
    )
    returning b.*;
end;
$$;

-- ---------------------------------------------------------------------
-- Reservar (placeBooking): común a la web, a las cuentas de cliente y al estudio
-- ---------------------------------------------------------------------
create function private.place_booking(
  p_session_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_source text,
  p_user_id uuid default null,
  p_is_sample boolean default false,
  p_code text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_phone text := private.normalize_phone(p_phone);
  v_email text := private.normalize_email(p_email);
  v_closes_at timestamptz;
  v_has_space boolean;
  v_booking public.bookings;
begin
  -- Bloquea la fila de la clase hasta el final de la transacción: si dos personas reservan
  -- a la vez la última plaza, la segunda espera a que termine la primera y ya la ve ocupada.
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'session_not_found';
  end if;

  if not private.is_valid_name(p_name) or not private.is_valid_email(p_email) or v_phone is null
     or p_source not in ('web', 'studio') then
    raise exception 'invalid_input';
  end if;

  if v_session.status = 'cancelled' then
    raise exception 'class_cancelled';
  end if;

  -- Desde la web, hasta que empieza la clase; el estudio puede añadir a alguien hasta que termina.
  v_closes_at := case when p_source = 'studio'
    then v_session.starts_at + make_interval(mins => v_session.duration_minutes)
    else v_session.starts_at end;
  if now() >= v_closes_at then
    raise exception 'past';
  end if;

  if exists (
    select 1 from public.bookings
    where session_id = v_session.id and email = v_email and status in ('confirmed', 'waitlisted')
  ) then
    raise exception 'duplicate';
  end if;

  v_has_space := (
    select count(*) from public.bookings where session_id = v_session.id and status = 'confirmed'
  ) < v_session.capacity;

  insert into public.bookings (session_id, user_id, code, name, email, phone, status, source, is_sample)
  values (
    v_session.id,
    p_user_id,
    coalesce(p_code, private.generate_booking_code()),
    private.normalize_name(p_name),
    v_email,
    v_phone,
    case when v_has_space then 'confirmed' else 'waitlisted' end,
    p_source,
    p_is_sample
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------
-- Cancelar (booking.ts)
-- ---------------------------------------------------------------------

create function private.assert_cancellable(p_booking public.bookings)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_booking.status = 'class_cancelled' then
    raise exception 'class_cancelled';
  end if;
  if p_booking.status = 'cancelled' then
    raise exception 'already_cancelled';
  end if;
end;
$$;

-- Cancela una reserva y, si liberaba plaza, sube a la primera de la lista de espera.
-- Quien la llama ya tiene bloqueada la fila de la clase.
create function private.cancel_one(
  p_booking_id uuid,
  out cancelled public.bookings,
  out promoted public.bookings
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_confirmed boolean;
begin
  select status = 'confirmed' into v_was_confirmed from public.bookings where id = p_booking_id;

  update public.bookings
  set status = 'cancelled', cancelled_at = now()
  where id = p_booking_id
  returning * into cancelled;

  if v_was_confirmed then
    select * into promoted
    from private.promote_waitlist(cancelled.session_id) p
    order by p.created_at, p.id
    limit 1;
  end if;
end;
$$;

-- Cancelación de cliente (cancelByClient): una plaza confirmada hasta 2 horas antes;
-- la lista de espera, hasta que empiece la clase. Devuelve la reserva y si subió alguien
-- (sin datos de esa persona).
create function private.cancel_by_client(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_booking public.bookings;
  v_result record;
begin
  select s.* into v_session
  from public.sessions s join public.bookings b on b.session_id = s.id
  where b.id = p_booking_id
  for update of s;

  -- Se vuelve a leer con la clase ya bloqueada: el estado puede haber cambiado mientras tanto.
  select * into v_booking from public.bookings where id = p_booking_id;
  perform private.assert_cancellable(v_booking);

  if now() >= v_session.starts_at then
    raise exception 'past';
  end if;
  if v_booking.status = 'confirmed' and now() > v_session.starts_at - interval '2 hours' then
    raise exception 'too_late';
  end if;

  select * into v_result from private.cancel_one(p_booking_id);
  return jsonb_build_object(
    'booking', private.booking_json(v_result.cancelled),
    'promoted', (v_result.promoted).id is not null
  );
end;
$$;

-- Borra una reserva (lo usa la restauración de la demo). Si era una plaza confirmada
-- de una clase que aún no ha empezado, sube la lista de espera.
create function private.remove_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_session public.sessions;
begin
  select s.* into v_session
  from public.sessions s join public.bookings b on b.session_id = s.id
  where b.id = p_booking_id
  for update of s;
  if not found then
    return;
  end if;

  delete from public.bookings where id = p_booking_id returning * into v_booking;
  if v_booking.status = 'confirmed' and now() < v_session.starts_at then
    perform private.promote_waitlist(v_session.id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Protección contra abuso en «Mis reservas»
-- Como mucho 5 intentos fallidos en 15 minutos por email y 20 por IP.
-- ---------------------------------------------------------------------

-- IP del visitante, si Supabase la pasa en las cabeceras (Cloudflare la pone en cf-connecting-ip).
create function private.request_ip()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_headers jsonb;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  return nullif(btrim(coalesce(
    v_headers ->> 'cf-connecting-ip',
    split_part(v_headers ->> 'x-forwarded-for', ',', 1)
  )), '');
exception when others then
  return null;
end;
$$;

create function private.check_attempts(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip text := private.request_ip();
begin
  if (
    select count(*) from public.lookup_attempts
    where email_hash = private.hash_text(p_email) and created_at > now() - interval '15 minutes'
  ) >= 5 then
    raise exception 'too_many_attempts';
  end if;

  if v_ip is not null and (
    select count(*) from public.lookup_attempts
    where ip_hash = private.hash_text(v_ip) and created_at > now() - interval '15 minutes'
  ) >= 20 then
    raise exception 'too_many_attempts';
  end if;
end;
$$;

create function private.record_failed_attempt(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip text := private.request_ip();
begin
  insert into public.lookup_attempts (email_hash, ip_hash)
  values (private.hash_text(p_email), case when v_ip is null then null else private.hash_text(v_ip) end);
  -- Limpieza de paso: los intentos de hace más de un día ya no sirven para nada.
  delete from public.lookup_attempts where created_at < now() - interval '1 day';
end;
$$;

-- ---------------------------------------------------------------------
-- Ninguna de estas funciones se puede llamar desde la app
-- ---------------------------------------------------------------------
revoke all on function
  private.normalize_email(text),
  private.normalize_name(text),
  private.is_valid_name(text),
  private.is_valid_email(text),
  private.normalize_phone(text),
  private.normalize_code(text),
  private.generate_booking_code(),
  private.hash_text(text),
  private.iso(timestamptz),
  private.is_demo_member(),
  private.require_studio_member(),
  private.mask_email(text),
  private.mask_phone(text),
  private.session_json(public.sessions),
  private.booking_json(public.bookings),
  private.studio_booking_json(public.bookings),
  private.waitlist_position(public.bookings),
  private.booking_details_json(public.bookings, boolean),
  private.promote_waitlist(uuid),
  private.place_booking(uuid, text, text, text, text, uuid, boolean, text),
  private.assert_cancellable(public.bookings),
  private.cancel_one(uuid),
  private.cancel_by_client(uuid),
  private.remove_booking(uuid),
  private.request_ip(),
  private.check_attempts(text),
  private.record_failed_attempt(text)
from public, anon, authenticated;
