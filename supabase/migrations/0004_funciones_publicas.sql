-- =====================================================================
-- 0004 · Funciones públicas
-- La única vía por la que un visitante (anon) toca los datos. Se llaman
-- desde la app como RPC: supabase.rpc('book_class', { ... }) o
-- POST /rest/v1/rpc/book_class.
--
-- security definer: se ejecutan con los permisos de su dueño, así pueden
-- contar y escribir reservas aunque el visitante no tenga acceso a la
-- tabla. Por eso validan todo lo que reciben y solo devuelven lo justo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Horario público: clases que empiezan en [p_from, p_to), con plazas ocupadas
-- y lista de espera como simples números. Es la «vista» pública de plazas libres:
-- una función y no una vista porque una vista con RLS no podría contar reservas
-- que el visitante no puede leer.
-- ---------------------------------------------------------------------
create function public.list_sessions(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Rango obligatorio y razonable (el calendario pide una semana; nunca más de 100 días).
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '100 days' then
    raise exception 'invalid_input';
  end if;

  return coalesce(
    (select jsonb_agg(private.session_json(s) order by s.starts_at, s.id)
     from public.sessions s
     where s.starts_at >= p_from and s.starts_at < p_to),
    '[]'::jsonb
  );
end;
$$;

-- Una clase, o null si no existe.
create function public.get_session(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.session_json(s) from public.sessions s where s.id = p_id;
$$;

-- ---------------------------------------------------------------------
-- Reservar. Si la clase está llena, la reserva entra en la lista de espera.
-- Con sesión iniciada, la reserva queda ligada a la cuenta y usa su email.
-- Con la cuenta de cliente demo se usan siempre su nombre, email y teléfono
-- de ejemplo: nadie puede dejar datos reales a la vista del siguiente visitante.
-- ---------------------------------------------------------------------
create function public.book_class(p_session_id uuid, p_name text, p_email text, p_phone text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_demo private.demo_accounts;
  v_name text := p_name;
  v_email text := p_email;
  v_phone text := p_phone;
  v_booking public.bookings;
begin
  if v_user_id is not null then
    select * into v_demo from private.demo_accounts where user_id = v_user_id and kind = 'client';
    if found then
      v_name := v_demo.display_name;
      v_email := v_demo.email;
      v_phone := v_demo.phone;
    else
      v_email := coalesce(nullif(auth.jwt() ->> 'email', ''), p_email);
    end if;
  end if;

  v_booking := private.place_booking(p_session_id, v_name, v_email, v_phone, 'web', v_user_id);
  return private.booking_details_json(v_booking);
end;
$$;

-- ---------------------------------------------------------------------
-- «Mis reservas» sin cuenta: email + código.
-- Devuelve solo esa reserva, o null si no coinciden. Cada fallo cuenta para
-- el límite de intentos. No se lanza un error en el fallo porque un error
-- desharía también el registro del intento.
-- ---------------------------------------------------------------------
create function public.find_booking(p_email text, p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := private.normalize_email(p_email);
  v_booking public.bookings;
begin
  perform private.check_attempts(v_email);

  select * into v_booking from public.bookings
  where code = private.normalize_code(p_code) and email = v_email;

  if not found then
    perform private.record_failed_attempt(v_email);
    return null;
  end if;
  return private.booking_details_json(v_booking);
end;
$$;

-- ---------------------------------------------------------------------
-- Cancelar con email + código (hasta 2 horas antes si es plaza confirmada).
-- Si se libera una plaza, sube la primera persona de la lista de espera.
-- Devuelve { booking, promoted: true/false } o { error: 'not_found' }.
-- ---------------------------------------------------------------------
create function public.cancel_booking(p_email text, p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := private.normalize_email(p_email);
  v_booking_id uuid;
begin
  perform private.check_attempts(v_email);

  select id into v_booking_id from public.bookings
  where code = private.normalize_code(p_code) and email = v_email;

  if v_booking_id is null then
    perform private.record_failed_attempt(v_email);
    return jsonb_build_object('error', 'not_found');
  end if;
  return private.cancel_by_client(v_booking_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Comprobación de vida, para que el proyecto gratuito no se pause por inactividad.
-- Hace una consulta real (barata) y no devuelve ningún dato.
-- security invoker: se ejecuta con los permisos de quien llama, que ya puede leer class_types.
-- ---------------------------------------------------------------------
create function public.health_check()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform 1 from public.class_types limit 1;
  return jsonb_build_object(
    'ok', true,
    'checked_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos: solo estas funciones, para visitantes y cuentas con sesión
-- ---------------------------------------------------------------------
revoke all on function
  public.list_sessions(timestamptz, timestamptz),
  public.get_session(uuid),
  public.book_class(uuid, text, text, text),
  public.find_booking(text, text),
  public.cancel_booking(text, text),
  public.health_check()
from public, anon, authenticated;

grant execute on function
  public.list_sessions(timestamptz, timestamptz),
  public.get_session(uuid),
  public.book_class(uuid, text, text, text),
  public.find_booking(text, text),
  public.cancel_booking(text, text),
  public.health_check()
to anon, authenticated;
