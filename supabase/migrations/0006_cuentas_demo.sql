-- =====================================================================
-- 0006 · Cuentas demo
-- La demo publica las credenciales de dos cuentas: «cliente demo» y
-- «estudio demo». Para que nadie las estropee al siguiente visitante:
--   · un trigger en auth.users impide cambiar su email o su contraseña
--     y borrarlas (iniciar sesión sigue funcionando);
--   · restore_demo_accounts() devuelve cada hora las cuentas y las reservas
--     del cliente demo a su estado de ejemplo (la programa supabase/cron.sql).
-- Las cuentas se crean a mano en Authentication → Users y se vinculan con
-- private.register_demo_account (ver supabase/README.md).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Blindaje: trigger BEFORE UPDATE OR DELETE en auth.users
-- Vive en private porque Supabase no deja crear funciones dentro del esquema auth.
-- ---------------------------------------------------------------------
create function private.guard_demo_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Solo la restauración activa esta marca, y solo dentro de su propia transacción.
  if current_setting('lumbra.restoring', true) = 'on' then
    return coalesce(new, old);
  end if;

  -- Cualquier cuenta que no sea demo: el trigger no hace nada.
  if not exists (select 1 from private.demo_accounts where user_id = old.id) then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'La cuenta demo no se puede borrar.';
  end if;

  if new.email is distinct from old.email
     or new.encrypted_password is distinct from old.encrypted_password
     or new.phone is distinct from old.phone
     -- Pedir un cambio de email también se bloquea (antes de que se envíe ningún correo).
     or (coalesce(new.email_change, '') <> '' and new.email_change is distinct from old.email_change)
  then
    raise exception 'La cuenta demo no puede cambiar su email, su teléfono ni su contraseña.';
  end if;

  -- El resto (last_sign_in_at, updated_at, metadatos de sesión…) sí: así el inicio de sesión funciona.
  return new;
end;
$$;

create trigger lumbra_guard_demo_users
  before update or delete on auth.users
  for each row execute function private.guard_demo_users();

-- ---------------------------------------------------------------------
-- Reservas de ejemplo del cliente demo
-- Se eligen según el estado real de las clases, para no superar nunca el aforo:
-- una confirmada (a más de 24 h, para poder cancelarla), una en lista de espera,
-- una pasada con asistencia y una cancelada.
-- ---------------------------------------------------------------------
create function private.create_demo_client_bookings(p_account private.demo_accounts)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_confirmed_id uuid;
  v_waitlist_id uuid;
  v_past public.sessions;
  v_cancelled_id uuid;
begin
  -- Confirmada: la primera clase con plazas libres a partir de mañana.
  select s.id into v_confirmed_id
  from public.sessions s
  where s.status = 'scheduled'
    and s.starts_at > now() + interval '24 hours'
    and (select count(*) from public.bookings b where b.session_id = s.id and b.status = 'confirmed') < s.capacity
  order by s.starts_at
  limit 1;
  if v_confirmed_id is not null then
    perform private.place_booking(v_confirmed_id, p_account.display_name, p_account.email, p_account.phone,
                                  'web', p_account.user_id, true);
  end if;

  -- En lista de espera: la primera clase llena que aún admite reservas.
  select s.id into v_waitlist_id
  from public.sessions s
  where s.status = 'scheduled'
    and s.starts_at > now() + interval '2 hours'
    and (select count(*) from public.bookings b where b.session_id = s.id and b.status = 'confirmed') >= s.capacity
  order by s.starts_at
  limit 1;
  if v_waitlist_id is not null then
    perform private.place_booking(v_waitlist_id, p_account.display_name, p_account.email, p_account.phone,
                                  'web', p_account.user_id, true);
  end if;

  -- Pasada: la última clase terminada esta semana o la anterior, con hueco. Vino.
  select s.* into v_past
  from public.sessions s
  where s.status = 'scheduled'
    and s.starts_at + make_interval(mins => s.duration_minutes) <= now()
    and s.starts_at > now() - interval '8 days'
    and (select count(*) from public.bookings b where b.session_id = s.id and b.status = 'confirmed') < s.capacity
  order by s.starts_at desc
  limit 1;
  if v_past.id is not null then
    insert into public.bookings (session_id, user_id, code, name, email, phone, status, source,
                                 attendance, is_sample, created_at)
    values (v_past.id, p_account.user_id, private.generate_booking_code(), p_account.display_name,
            p_account.email, p_account.phone, 'confirmed', 'web', 'attended', true,
            v_past.starts_at - interval '2 days');
  end if;

  -- Cancelada por ella: otra clase futura cualquiera.
  select s.id into v_cancelled_id
  from public.sessions s
  where s.status = 'scheduled'
    and s.starts_at > now() + interval '24 hours'
    and s.id is distinct from v_confirmed_id
    and s.id is distinct from v_waitlist_id
  order by s.starts_at
  limit 1;
  if v_cancelled_id is not null then
    insert into public.bookings (session_id, user_id, code, name, email, phone, status, source,
                                 is_sample, created_at, cancelled_at)
    values (v_cancelled_id, p_account.user_id, private.generate_booking_code(), p_account.display_name,
            p_account.email, p_account.phone, 'cancelled', 'web', true,
            now() - interval '2 days', now() - interval '1 day');
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Restauración (cada hora): credenciales, fila de miembro demo y reservas del cliente demo
-- ---------------------------------------------------------------------
create function private.restore_demo_accounts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account private.demo_accounts;
  v_booking_id uuid;
begin
  -- Alternativa al trigger: si algo hubiera cambiado el email o la contraseña, vuelven a su copia.
  perform set_config('lumbra.restoring', 'on', true);
  update auth.users u
  set email = d.email, encrypted_password = d.encrypted_password
  from private.demo_accounts d
  where u.id = d.user_id
    and (u.email is distinct from d.email or u.encrypted_password is distinct from d.encrypted_password);
  perform set_config('lumbra.restoring', 'off', true);

  insert into public.studio_members (user_id, display_name, is_demo)
  select user_id, display_name, true from private.demo_accounts where kind = 'studio'
  on conflict (user_id) do update set display_name = excluded.display_name, is_demo = true;

  for v_account in select * from private.demo_accounts where kind = 'client' loop
    for v_booking_id in select id from public.bookings where user_id = v_account.user_id loop
      perform private.remove_booking(v_booking_id);
    end loop;
    perform private.create_demo_client_bookings(v_account);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Vincular una cuenta creada a mano como cuenta demo
--   select private.register_demo_account('cliente@lumbra.example', 'client', 'Ana Demo', '+34 600 000 900');
--   select private.register_demo_account('estudio@lumbra.example', 'studio', 'Lucía Ferrer', null);
-- ---------------------------------------------------------------------
create function private.register_demo_account(p_email text, p_kind text, p_display_name text, p_phone text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user record;
  v_phone text := private.normalize_phone(p_phone);
begin
  select id, email, encrypted_password into v_user
  from auth.users where lower(email) = private.normalize_email(p_email);
  if not found then
    raise exception 'No existe ningún usuario con el email %. Créalo antes en Authentication → Users.', p_email;
  end if;
  if coalesce(v_user.encrypted_password, '') = '' then
    raise exception 'La cuenta % no tiene contraseña. Créala con email y contraseña.', p_email;
  end if;
  if p_kind is null or p_kind not in ('client', 'studio') then
    raise exception 'El tipo de cuenta demo debe ser client o studio.';
  end if;
  if not private.is_valid_name(p_display_name) then
    raise exception 'Escribe un nombre de ejemplo de 2 a 80 caracteres.';
  end if;
  if p_kind = 'client' and v_phone is null then
    raise exception 'El cliente demo necesita un teléfono de ejemplo válido, como +34 600 000 900.';
  end if;

  insert into private.demo_accounts (user_id, kind, email, encrypted_password, display_name, phone)
  values (v_user.id, p_kind, v_user.email, v_user.encrypted_password, private.normalize_name(p_display_name), v_phone)
  on conflict (user_id) do update
  set kind = excluded.kind,
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      display_name = excluded.display_name,
      phone = excluded.phone;

  perform private.restore_demo_accounts();
  return format('Cuenta demo %s vinculada como %s.', v_user.email, p_kind);
end;
$$;

revoke all on function
  private.guard_demo_users(),
  private.create_demo_client_bookings(private.demo_accounts),
  private.restore_demo_accounts(),
  private.register_demo_account(text, text, text, text)
from public, anon, authenticated;
