-- =====================================================================
-- 0001 · Esquema
-- Tablas, restricciones, índices y marcas de tiempo de Lumbra Pilates.
-- Replica el modelo de src/data/types.ts.
--
-- Todas las fechas son timestamptz: un instante absoluto. La hora local
-- del estudio (Europe/Madrid) solo se usa donde importa (datos de ejemplo
-- y tareas programadas) con «at time zone 'Europe/Madrid'».
-- =====================================================================

-- Esquema para lo interno: Supabase solo expone por la API el esquema public,
-- así que nada de lo que viva en private se puede llamar ni leer desde la app.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------
-- Catálogo: tipos de clase e instructoras
-- ---------------------------------------------------------------------
create table public.class_types (
  id               text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (char_length(btrim(name)) between 2 and 80),
  summary          text not null check (char_length(summary) <= 400),
  level            text not null check (level in ('iniciacion', 'intermedio', 'avanzado', 'todos')),
  intensity        smallint not null check (intensity between 1 and 3),
  -- Duración y aforo habituales: los valores que se proponen al programar una clase de este tipo.
  duration_minutes integer not null check (duration_minutes between 15 and 120),
  capacity         integer not null check (capacity between 1 and 30),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.instructors (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(btrim(name)) between 2 and 80),
  role        text not null check (char_length(role) <= 80),
  bio         text not null check (char_length(bio) <= 600),
  specialties text[] not null default '{}',
  initials    text not null check (initials ~ '^[A-ZÁÉÍÓÚÑ]{1,3}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Clases programadas
-- ---------------------------------------------------------------------
create table public.sessions (
  id               uuid primary key default gen_random_uuid(),
  class_type_id    text not null references public.class_types (id) on delete restrict,
  instructor_id    text not null references public.instructors (id) on delete restrict,
  starts_at        timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 120),
  capacity         integer not null check (capacity between 1 and 30),
  status           text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index sessions_starts_at_idx on public.sessions (starts_at);

-- ---------------------------------------------------------------------
-- Reservas (contienen datos personales: nadie las lee directamente salvo su dueña)
-- ---------------------------------------------------------------------
create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions (id) on delete cascade,
  -- Cuenta que reservó; null = reserva sin cuenta (email + código).
  user_id      uuid references auth.users (id) on delete set null,
  code         text not null unique check (code ~ '^LUM-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$'),
  name         text not null check (char_length(name) between 2 and 80 and name = btrim(name)),
  email        text not null check (
                 email = lower(btrim(email))
                 and char_length(email) <= 254
                 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
               ),
  phone        text not null check (phone ~ '^\+34 [6789][0-9]{2} [0-9]{3} [0-9]{3}$'),
  -- class_cancelled: la clase la canceló el estudio.
  status       text not null check (status in ('confirmed', 'waitlisted', 'cancelled', 'class_cancelled')),
  source       text not null check (source in ('web', 'studio')),
  attendance   text check (attendance in ('attended', 'no_show')),
  -- La creó el seed o la restauración de la demo, no una persona.
  is_sample    boolean not null default false,
  -- clock_timestamp() y no now(): es la hora real de cada inserción y fija el orden de llegada.
  created_at   timestamptz not null default clock_timestamp(),
  cancelled_at timestamptz,
  -- Momento en que pasó de la lista de espera a plaza confirmada.
  promoted_at  timestamptz,
  updated_at   timestamptz not null default now(),
  constraint bookings_attendance_only_confirmed check (attendance is null or status = 'confirmed'),
  constraint bookings_cancelled_at_matches_status check (
    (status in ('cancelled', 'class_cancelled')) = (cancelled_at is not null)
  )
);

-- Nadie puede tener dos reservas activas (confirmada o en lista) en la misma clase con el mismo email.
-- Las funciones ya lo comprueban; este índice es la red de seguridad.
create unique index bookings_one_active_per_email_idx
  on public.bookings (session_id, email)
  where status in ('confirmed', 'waitlisted');

-- Plazas confirmadas y lista de espera de una clase, en orden de llegada.
create index bookings_session_status_idx on public.bookings (session_id, status, created_at);
create index bookings_user_id_idx on public.bookings (user_id) where user_id is not null;

-- ---------------------------------------------------------------------
-- Miembros del estudio: solo estas cuentas entran en el panel
-- ---------------------------------------------------------------------
create table public.studio_members (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  -- Cuenta demo pública: ve enmascarados los datos que escriben los visitantes.
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Intentos fallidos de «Mis reservas» (protección contra quien prueba códigos al azar)
-- Se guarda el hash, nunca el email ni la IP en claro.
-- ---------------------------------------------------------------------
create table public.lookup_attempts (
  id         bigint generated always as identity primary key,
  email_hash bytea not null,
  ip_hash    bytea,
  created_at timestamptz not null default now()
);

create index lookup_attempts_email_idx on public.lookup_attempts (email_hash, created_at);
create index lookup_attempts_ip_idx on public.lookup_attempts (ip_hash, created_at) where ip_hash is not null;
create index lookup_attempts_created_at_idx on public.lookup_attempts (created_at);

-- ---------------------------------------------------------------------
-- Cuentas demo (esquema private: invisible para la app)
-- Copia del email y de la contraseña cifrada para poder restaurarlas,
-- y los datos de ejemplo con los que reserva el cliente demo.
-- ---------------------------------------------------------------------
create table private.demo_accounts (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  kind               text not null check (kind in ('client', 'studio')),
  email              text not null,
  encrypted_password text not null,
  display_name       text not null check (char_length(btrim(display_name)) between 2 and 80),
  phone              text check (phone ~ '^\+34 [6789][0-9]{2} [0-9]{3} [0-9]{3}$'),
  created_at         timestamptz not null default now(),
  constraint demo_accounts_client_has_phone check (kind <> 'client' or phone is not null)
);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger class_types_touch before update on public.class_types
  for each row execute function private.touch_updated_at();
create trigger instructors_touch before update on public.instructors
  for each row execute function private.touch_updated_at();
create trigger sessions_touch before update on public.sessions
  for each row execute function private.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function private.touch_updated_at();
