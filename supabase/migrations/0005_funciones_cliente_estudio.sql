-- =====================================================================
-- 0005 · Funciones de cliente con cuenta y del estudio
-- Cliente: ve y cancela solo sus reservas, con las mismas reglas que sin cuenta.
-- Estudio: lo primero que hacen todas es comprobar que quien llama está en
-- studio_members; si no, «unauthorized». Replican src/data/logic/sessions.ts
-- y booking.ts. Las reservas que devuelven pasan por studio_booking_json,
-- que enmascara los datos si la cuenta es la demo del estudio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cliente con cuenta
-- ---------------------------------------------------------------------

-- Sus reservas, con la clase y la posición en la lista de espera.
create function public.list_my_bookings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  return coalesce(
    (select jsonb_agg(private.booking_details_json(b) order by s.starts_at, b.created_at)
     from public.bookings b join public.sessions s on s.id = b.session_id
     where b.user_id = v_user_id),
    '[]'::jsonb
  );
end;
$$;

-- Cancela una reserva suya. Si no es suya responde igual que si no existiera.
create function public.cancel_my_booking(p_booking_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;
  if not exists (select 1 from public.bookings where id = p_booking_id and user_id = v_user_id) then
    raise exception 'not_found';
  end if;
  return private.cancel_by_client(p_booking_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Estudio: ayudantes de clases (sessions.ts)
-- ---------------------------------------------------------------------

-- Datos de una clase válidos: tipo e instructora existentes, aforo 1–30, duración 15–120, en el futuro.
create function private.assert_valid_session(
  p_class_type_id text, p_instructor_id text, p_starts_at timestamptz,
  p_duration_minutes integer, p_capacity integer
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_starts_at is null
     or p_capacity is null or p_capacity not between 1 and 30
     or p_duration_minutes is null or p_duration_minutes not between 15 and 120
     or not exists (select 1 from public.class_types where id = p_class_type_id)
     or not exists (select 1 from public.instructors where id = p_instructor_id) then
    raise exception 'invalid_input';
  end if;
  if p_starts_at <= now() then
    raise exception 'past';
  end if;
end;
$$;

-- El estudio tiene una sola sala: dos clases programadas no pueden coincidir.
create function private.assert_no_overlap(
  p_starts_at timestamptz, p_duration_minutes integer, p_ignore_id uuid default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  -- Un candado para las altas y cambios de horario: dos a la vez no pueden colarse en el mismo hueco.
  perform pg_advisory_xact_lock(hashtext('lumbra:sala'));
  if exists (
    select 1 from public.sessions s
    where s.status = 'scheduled'
      and s.id is distinct from p_ignore_id
      and s.starts_at < p_starts_at + make_interval(mins => p_duration_minutes)
      and p_starts_at < s.starts_at + make_interval(mins => s.duration_minutes)
  ) then
    raise exception 'overlap';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Estudio: clases
-- ---------------------------------------------------------------------

create function public.create_session(
  p_class_type_id text, p_instructor_id text, p_starts_at timestamptz,
  p_duration_minutes integer, p_capacity integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
begin
  perform private.require_studio_member();
  perform private.assert_valid_session(p_class_type_id, p_instructor_id, p_starts_at, p_duration_minutes, p_capacity);
  perform private.assert_no_overlap(p_starts_at, p_duration_minutes);

  insert into public.sessions (class_type_id, instructor_id, starts_at, duration_minutes, capacity)
  values (p_class_type_id, p_instructor_id, p_starts_at, p_duration_minutes, p_capacity)
  returning * into v_session;

  return private.session_json(v_session);
end;
$$;

-- Edita una clase que aún no ha empezado (incluido cambiar el aforo). El aforo nunca
-- puede bajar de las plazas confirmadas; si sube, entra gente de la lista de espera.
create function public.update_session(
  p_id uuid, p_class_type_id text, p_instructor_id text, p_starts_at timestamptz,
  p_duration_minutes integer, p_capacity integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_promoted jsonb;
begin
  perform private.require_studio_member();

  select * into v_session from public.sessions where id = p_id for update;
  if not found then
    raise exception 'session_not_found';
  end if;
  if v_session.status = 'cancelled' then
    raise exception 'class_cancelled';
  end if;
  if v_session.starts_at <= now() then
    raise exception 'past';
  end if;

  perform private.assert_valid_session(p_class_type_id, p_instructor_id, p_starts_at, p_duration_minutes, p_capacity);
  if p_capacity < (select count(*) from public.bookings where session_id = p_id and status = 'confirmed') then
    raise exception 'capacity_below_booked';
  end if;
  perform private.assert_no_overlap(p_starts_at, p_duration_minutes, p_id);

  update public.sessions
  set class_type_id = p_class_type_id,
      instructor_id = p_instructor_id,
      starts_at = p_starts_at,
      duration_minutes = p_duration_minutes,
      capacity = p_capacity
  where id = p_id
  returning * into v_session;

  select coalesce(jsonb_agg(private.studio_booking_json(p) order by p.created_at, p.id), '[]'::jsonb)
  into v_promoted
  from private.promote_waitlist(p_id) p;

  return jsonb_build_object('session', private.session_json(v_session), 'promoted', v_promoted);
end;
$$;

-- Cancela una clase futura: todas sus reservas activas pasan a «cancelada por el estudio».
-- Devuelve las reservas afectadas.
create function public.cancel_session(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_affected jsonb;
begin
  perform private.require_studio_member();

  select * into v_session from public.sessions where id = p_id for update;
  if not found then
    raise exception 'session_not_found';
  end if;
  if v_session.status = 'cancelled' then
    raise exception 'class_cancelled';
  end if;
  if v_session.starts_at <= now() then
    raise exception 'past';
  end if;

  with affected as (
    update public.bookings
    set status = 'class_cancelled', cancelled_at = now()
    where session_id = p_id and status in ('confirmed', 'waitlisted')
    returning *
  )
  select coalesce(jsonb_agg(private.studio_booking_json(a) order by a.created_at, a.id), '[]'::jsonb)
  into v_affected
  from affected a;

  update public.sessions set status = 'cancelled' where id = p_id;
  return v_affected;
end;
$$;

-- ---------------------------------------------------------------------
-- Estudio: reservas
-- ---------------------------------------------------------------------

-- Reserva manual desde el panel: mismas reglas, pero se puede añadir a alguien hasta que la clase termina.
create function public.add_manual_booking(p_session_id uuid, p_name text, p_email text, p_phone text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  perform private.require_studio_member();
  v_booking := private.place_booking(p_session_id, p_name, p_email, p_phone, 'studio');
  return private.booking_details_json(v_booking, true);
end;
$$;

-- Cancelación desde el panel: sin límite de horas, mientras la clase no haya terminado.
create function public.cancel_booking_by_id(p_booking_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_booking public.bookings;
  v_result record;
begin
  perform private.require_studio_member();

  select s.* into v_session
  from public.sessions s join public.bookings b on b.session_id = s.id
  where b.id = p_booking_id
  for update of s;
  if not found then
    raise exception 'not_found';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  perform private.assert_cancellable(v_booking);
  if now() >= v_session.starts_at + make_interval(mins => v_session.duration_minutes) then
    raise exception 'past';
  end if;

  select * into v_result from private.cancel_one(p_booking_id);
  return jsonb_build_object(
    'booking', private.studio_booking_json(v_result.cancelled),
    'promoted', case when (v_result.promoted).id is null then null
                     else private.studio_booking_json(v_result.promoted) end
  );
end;
$$;

-- Marca «asistió», «no vino» o lo deja sin marcar (null). Solo plazas confirmadas,
-- y desde 30 minutos antes de que empiece la clase.
create function public.set_attendance(p_booking_id uuid, p_attendance text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_starts_at timestamptz;
begin
  perform private.require_studio_member();
  if p_attendance is not null and p_attendance not in ('attended', 'no_show') then
    raise exception 'invalid_input';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'not_confirmed';
  end if;

  select starts_at into v_starts_at from public.sessions where id = v_booking.session_id;
  if now() < v_starts_at - interval '30 minutes' then
    raise exception 'attendance_too_early';
  end if;

  update public.bookings set attendance = p_attendance where id = p_booking_id returning * into v_booking;
  return private.studio_booking_json(v_booking);
end;
$$;

-- Asistentes de una clase: confirmadas y lista de espera por orden de llegada,
-- canceladas de la más reciente a la más antigua.
create function public.get_roster(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
begin
  perform private.require_studio_member();

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception 'session_not_found';
  end if;

  return jsonb_build_object(
    'session', private.session_json(v_session),
    'confirmed', coalesce((
      select jsonb_agg(private.studio_booking_json(b) order by b.created_at, b.id)
      from public.bookings b where b.session_id = p_session_id and b.status = 'confirmed'), '[]'::jsonb),
    'waitlist', coalesce((
      select jsonb_agg(private.studio_booking_json(b) order by b.created_at, b.id)
      from public.bookings b where b.session_id = p_session_id and b.status = 'waitlisted'), '[]'::jsonb),
    'cancelled', coalesce((
      select jsonb_agg(private.studio_booking_json(b) order by b.cancelled_at desc, b.id)
      from public.bookings b
      where b.session_id = p_session_id and b.status in ('cancelled', 'class_cancelled')), '[]'::jsonb)
  );
end;
$$;

-- Reservas de las clases que empiezan en [p_from, p_to), para calcular las métricas
-- en la app con la misma función que ya existe (computeMetrics).
create function public.list_studio_bookings(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_studio_member();
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '100 days' then
    raise exception 'invalid_input';
  end if;

  return coalesce(
    (select jsonb_agg(private.studio_booking_json(b) order by s.starts_at, b.created_at, b.id)
     from public.bookings b join public.sessions s on s.id = b.session_id
     where s.starts_at >= p_from and s.starts_at < p_to),
    '[]'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
revoke all on function
  private.assert_valid_session(text, text, timestamptz, integer, integer),
  private.assert_no_overlap(timestamptz, integer, uuid)
from public, anon, authenticated;

revoke all on function
  public.list_my_bookings(),
  public.cancel_my_booking(uuid),
  public.create_session(text, text, timestamptz, integer, integer),
  public.update_session(uuid, text, text, timestamptz, integer, integer),
  public.cancel_session(uuid),
  public.add_manual_booking(uuid, text, text, text),
  public.cancel_booking_by_id(uuid),
  public.set_attendance(uuid, text),
  public.get_roster(uuid),
  public.list_studio_bookings(timestamptz, timestamptz)
from public, anon, authenticated;

-- Solo para cuentas con sesión; dentro, cada función comprueba quién es.
grant execute on function
  public.list_my_bookings(),
  public.cancel_my_booking(uuid),
  public.create_session(text, text, timestamptz, integer, integer),
  public.update_session(uuid, text, text, timestamptz, integer, integer),
  public.cancel_session(uuid),
  public.add_manual_booking(uuid, text, text, text),
  public.cancel_booking_by_id(uuid),
  public.set_attendance(uuid, text),
  public.get_roster(uuid),
  public.list_studio_bookings(timestamptz, timestamptz)
to authenticated;
