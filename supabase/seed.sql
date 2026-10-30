-- =====================================================================
-- Datos de ejemplo de la demo (opcional)
-- Ejecútalo después de las migraciones si quieres la demo con datos.
-- Un estudio real no lo ejecutaría.
--
-- Replica src/data/demo/seed: el mismo catálogo, la misma clientela
-- ficticia (emails .example) y la misma plantilla semanal, con fechas
-- relativas a hoy para que la demo siempre parezca viva.
--
-- Crea además:
--   private.seed_demo(p_now)  siembra clases y reservas alrededor de p_now
--   private.restore_demo()    cada hora: cuentas demo, catálogo y reservas de ejemplo
--   private.reset_demo()      cada noche: borra reservas y clases y vuelve a sembrar
--   private.demo_hourly()     lo que llama pg_cron (ver supabase/cron.sql)
-- Se puede volver a ejecutar entero sin problema: termina con reset_demo().
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clientela ficticia y plantilla semanal (privadas: la app no las ve)
-- ---------------------------------------------------------------------
create table if not exists private.demo_customers (
  idx   integer primary key,
  name  text not null,
  email text not null unique,
  phone text not null
);
alter table private.demo_customers enable row level security;
revoke all on table private.demo_customers from public, anon, authenticated;

create table if not exists private.demo_slots (
  weekday       integer not null check (weekday between 1 and 6),  -- 1 = lunes … 6 = sábado
  starts_time   time not null,
  class_type_id text not null,
  instructor_id text not null,
  capacity      integer not null,
  booked        integer not null,                                  -- plazas ocupadas en una semana normal
  primary key (weekday, starts_time)
);
alter table private.demo_slots enable row level security;
revoke all on table private.demo_slots from public, anon, authenticated;

-- Email: nombre.primerapellido sin tildes @correo.example; teléfono: +34 600 000 NNN.
insert into private.demo_customers (idx, name, email, phone)
select n.idx - 1,
       n.name,
       lower(translate(split_part(n.name, ' ', 1) || '.' || split_part(n.name, ' ', 2),
                       'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇáéíóúàèìòùäëïöüñç',
                       'AEIOUAEIOUAEIOUNCaeiouaeiouaeiounc')) || '@correo.example',
       '+34 600 000 ' || lpad((n.idx - 1)::text, 3, '0')
from unnest(array[
  'Ana López Serrano', 'Pablo Ruiz Navarro', 'Carmen Vidal Ortega', 'Laura Martínez Gil',
  'Sofía Romero Blasco', 'Elena Torres Sanchis', 'Irene Castro Mora', 'Marina Delgado Ferrer',
  'Claudia Herrera Pons', 'Paula Jiménez Bosch', 'Nuria Molina Esteve', 'Alba Ramos Cano',
  'Cristina Iglesias Roig', 'Beatriz Vega Climent', 'Silvia Medina Llorens', 'Raquel Garrido Peris',
  'Patricia Cortés Alonso', 'Lucía Santos Mira', 'Andrea Rubio Ventura', 'Marta Prieto Sala',
  'Teresa Fuentes Grau', 'Rocío Cabrera Moll', 'Julia Campos Barberà', 'Noelia Vázquez Soria',
  'Eva Calvo Montoro', 'Inés Domínguez Ribes', 'Celia Méndez Cuesta', 'Rosa Aguilar Puig',
  'Lorena Pascual Benet', 'Miriam León Tormo', 'Sara Herrero Sempere', 'Ainhoa Lorenzo Vila',
  'Natalia Gallego Martí', 'Mónica Crespo Faus', 'Begoña Marín Ibarra', 'Pilar Sanz Escrivà',
  'Lidia Parra Albert', 'Olga Nieto Ferrando', 'Victoria Soler Arnau', 'Gloria Cruz Mestre',
  'Aitana Reyes Pastor', 'Carla Moreno Belda', 'Judith Carmona Giner', 'Susana Benítez Llopis',
  'Adriana Santana Cerdà', 'Daniel Ortiz Ballester', 'Javier Rojas Simó', 'Sergio Gómez Tarín',
  'Álvaro Núñez Bonet', 'Héctor Pérez Marco', 'Diego Flores Camps', 'Rubén Ferrer Andrés',
  'Marcos Serrano Vives', 'Iván Morales Gisbert', 'Óscar Sáez Juan', 'Hugo Lozano Monzó',
  'Nicolás Gil Valls', 'Tomás Ibáñez Roca', 'Martina Mas Climent', 'Valeria Rius Tena'
]) with ordinality as n(name, idx)
on conflict (idx) do update set name = excluded.name, email = excluded.email, phone = excluded.phone;

insert into private.demo_slots (weekday, starts_time, class_type_id, instructor_id, capacity, booked) values
  (1, '08:00', 'reformer-esencial', 'lucia-ferrer', 8, 6),
  (1, '10:00', 'mat-flow',          'marta-ibanez', 12, 7),
  (1, '14:00', 'respira-y-estira',  'nerea-soler', 10, 4),
  (1, '18:30', 'reformer-intenso',  'lucia-ferrer', 8, 8),
  (1, '20:00', 'mat-flow',          'marta-ibanez', 12, 11),
  (2, '07:30', 'reformer-intenso',  'lucia-ferrer', 8, 7),
  (2, '09:30', 'respira-y-estira',  'nerea-soler', 10, 5),
  (2, '13:30', 'reformer-esencial', 'lucia-ferrer', 8, 3),
  (2, '19:00', 'mat-flow',          'marta-ibanez', 12, 12),
  (2, '20:15', 'respira-y-estira',  'nerea-soler', 10, 8),
  (3, '08:00', 'reformer-esencial', 'lucia-ferrer', 8, 5),
  (3, '10:00', 'mat-flow',          'marta-ibanez', 12, 6),
  (3, '14:00', 'reformer-intenso',  'lucia-ferrer', 8, 4),
  (3, '18:30', 'reformer-esencial', 'lucia-ferrer', 8, 8),
  (3, '20:00', 'respira-y-estira',  'nerea-soler', 10, 9),
  (4, '07:30', 'mat-flow',          'marta-ibanez', 12, 5),
  (4, '09:30', 'reformer-esencial', 'lucia-ferrer', 8, 7),
  (4, '13:30', 'respira-y-estira',  'nerea-soler', 10, 2),
  (4, '18:00', 'reformer-intenso',  'lucia-ferrer', 8, 8),
  (4, '19:15', 'mat-flow',          'marta-ibanez', 12, 10),
  (4, '20:30', 'respira-y-estira',  'nerea-soler', 10, 6),
  (5, '08:00', 'reformer-intenso',  'lucia-ferrer', 8, 6),
  (5, '10:00', 'respira-y-estira',  'nerea-soler', 10, 7),
  (5, '14:00', 'mat-flow',          'marta-ibanez', 12, 4),
  (5, '18:00', 'reformer-esencial', 'lucia-ferrer', 8, 7),
  (6, '09:30', 'mat-flow',          'marta-ibanez', 12, 12),
  (6, '11:00', 'reformer-esencial', 'lucia-ferrer', 8, 8),
  (6, '12:15', 'respira-y-estira',  'nerea-soler', 10, 6)
on conflict (weekday, starts_time) do update
set class_type_id = excluded.class_type_id, instructor_id = excluded.instructor_id,
    capacity = excluded.capacity, booked = excluded.booked;

-- ---------------------------------------------------------------------
-- Catálogo de ejemplo. Se repone cada hora: si alguien edita o añade tipos
-- o instructoras con la cuenta demo, vuelven a su estado.
-- ---------------------------------------------------------------------
create or replace function private.seed_catalog()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.class_types (id, name, summary, level, intensity, duration_minutes, capacity) values
    ('reformer-esencial', 'Reformer Esencial',
     'Tu primera toma de contacto con la máquina: alineación, respiración y control del centro, a un ritmo pausado.',
     'iniciacion', 2, 50, 8),
    ('mat-flow', 'Mat Flow',
     'Pilates en esterilla con secuencias fluidas que encadenan fuerza y movilidad. Adaptamos cada ejercicio a tu nivel.',
     'todos', 2, 55, 12),
    ('reformer-intenso', 'Reformer Intenso',
     'Más carga, más tempo y transiciones exigentes para quien ya domina la técnica y busca un reto.',
     'avanzado', 3, 50, 8),
    ('respira-y-estira', 'Respira y Estira',
     'Movilidad suave, estiramientos y trabajo respiratorio para soltar tensiones y terminar el día en calma.',
     'iniciacion', 1, 45, 10)
  on conflict (id) do update
  set name = excluded.name, summary = excluded.summary, level = excluded.level, intensity = excluded.intensity,
      duration_minutes = excluded.duration_minutes, capacity = excluded.capacity;

  insert into public.instructors (id, name, role, bio, specialties, initials) values
    ('lucia-ferrer', 'Lucía Ferrer', 'Fundadora · Reformer',
     'Fisioterapeuta y formadora de pilates desde hace doce años. Abrió Lumbra para enseñar un método preciso y sin prisas.',
     array['Reformer', 'Readaptación'], 'LF'),
    ('marta-ibanez', 'Marta Ibáñez', 'Instructora · Mat',
     'Exbailarina especializada en suelo pélvico y pilates pre y posparto. Sus clases de esterilla son pura fluidez.',
     array['Mat', 'Suelo pélvico'], 'MI'),
    ('nerea-soler', 'Nerea Soler', 'Instructora · Movilidad',
     'Combina pilates, movilidad articular y respiración consciente. Ideal si vienes con la espalda cargada.',
     array['Movilidad', 'Respiración'], 'NS')
  on conflict (id) do update
  set name = excluded.name, role = excluded.role, bio = excluded.bio,
      specialties = excluded.specialties, initials = excluded.initials;

  -- Lo que no es del catálogo de ejemplo y no usa ninguna clase, fuera.
  delete from public.class_types ct
  where ct.id not in ('reformer-esencial', 'mat-flow', 'reformer-intenso', 'respira-y-estira')
    and not exists (select 1 from public.sessions s where s.class_type_id = ct.id);
  delete from public.instructors i
  where i.id not in ('lucia-ferrer', 'marta-ibanez', 'nerea-soler')
    and not exists (select 1 from public.sessions s where s.instructor_id = i.id);
end;
$$;

-- Código aleatorio que no choque con los dos códigos fijos de ejemplo.
create or replace function private.seed_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  loop
    v_code := private.generate_booking_code();
    if v_code not in ('LUM-7K3Q', 'LUM-W8HT') then
      return v_code;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Clases y reservas de ejemplo (buildSeed): la semana pasada, esta y las dos siguientes
-- ---------------------------------------------------------------------
create or replace function private.seed_demo(p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Esta semana: clases llenas con lista de espera (franja → personas esperando).
  v_waitlist_this_week constant jsonb := '{"1 18:30": 2, "2 19:00": 3, "4 18:00": 1, "6 09:30": 2}';
  -- La semana que viene: clases que ya se han llenado.
  v_full_next_week constant jsonb := '{"4 18:00": 1, "6 09:30": 2}';
  -- Esta semana el estudio ha cancelado una clase (Nerea, de baja).
  v_cancelled_this_week constant text := '4 13:30';

  v_monday date := date_trunc('week', p_now at time zone 'Europe/Madrid')::date;
  v_week integer;
  v_slot private.demo_slots;
  v_key text;
  v_duration integer;
  v_starts timestamptz;
  v_session public.sessions;
  v_ended boolean;
  v_is_cancelled boolean;
  v_has_promotion boolean;
  v_showcase_idx integer;
  v_showcase_code text;
  v_cancelled_n integer;
  v_confirmed_n integer;
  v_waitlist_n integer;
  v_lead integer;
  v_people integer[];
  v_ordered integer[];
  v_statuses text[];
  v_n integer;
  v_base timestamptz;
  v_created timestamptz;
  v_last_confirmed timestamptz;
  v_customer private.demo_customers;
  v_status text;
  v_cancelled_at timestamptz;
  v_promoted_at timestamptz;
  v_attendance text;
  v_source text;
  v_code text;
begin
  -- Semilla fija: los datos salen siempre con el mismo reparto.
  perform setseed(0.20261029);

  for v_week in -1..2 loop
    for v_slot in select * from private.demo_slots order by weekday, starts_time loop
      v_key := v_slot.weekday || ' ' || to_char(v_slot.starts_time, 'HH24:MI');
      select duration_minutes into v_duration from public.class_types where id = v_slot.class_type_id;
      -- Fecha y hora locales de Madrid → instante absoluto (tiene en cuenta el cambio de hora).
      v_starts := ((v_monday + (v_week * 7 + v_slot.weekday - 1)) + v_slot.starts_time) at time zone 'Europe/Madrid';
      v_ended := v_starts + make_interval(mins => v_duration) <= p_now;
      v_is_cancelled := v_week = 0 and v_key = v_cancelled_this_week;
      v_has_promotion := v_week = 0 and v_waitlist_this_week ? v_key;
      v_showcase_idx := null;
      v_showcase_code := null;
      if v_week = 1 and v_key = '4 18:00' then
        v_showcase_idx := 0;  v_showcase_code := 'LUM-7K3Q';  -- Ana López, plaza confirmada
      elsif v_week = 1 and v_key = '6 09:30' then
        v_showcase_idx := 1;  v_showcase_code := 'LUM-W8HT';  -- Pablo Ruiz, en lista de espera
      end if;

      -- Cuántas personas de cada tipo (planFor)
      v_cancelled_n := 0;
      if v_week < 2 then
        if random() < 0.45 then v_cancelled_n := 1; end if;
      end if;
      v_waitlist_n := 0;
      if v_week = -1 then
        v_confirmed_n := v_slot.booked - (case when random() < 0.3 then 1 else 0 end);
      elsif v_week = 0 then
        v_confirmed_n := v_slot.booked;
        v_waitlist_n := coalesce((v_waitlist_this_week ->> v_key)::integer, 0);
      elsif v_week = 1 then
        if v_full_next_week ? v_key then
          v_confirmed_n := v_slot.capacity;
          v_waitlist_n := (v_full_next_week ->> v_key)::integer;
        else
          v_confirmed_n := greatest(1, v_slot.booked - 3);
        end if;
      else
        v_confirmed_n := round(v_slot.booked * 0.35);
      end if;

      -- La primera cancelación de una clase con lista de espera es la que hizo subir a alguien.
      v_lead := v_cancelled_n + (case when v_has_promotion then 1 else 0 end);

      select array_agg(idx order by random()) into v_people from private.demo_customers where idx >= 2;
      v_ordered := v_people[1:v_lead + v_confirmed_n + v_waitlist_n];
      v_statuses := array_fill('cancelled'::text, array[v_lead])
                 || array_fill('confirmed'::text, array[v_confirmed_n])
                 || array_fill('waitlisted'::text, array[v_waitlist_n]);
      if v_showcase_idx = 0 then
        v_ordered[v_lead + 1] := 0;
      elsif v_showcase_idx = 1 then
        v_ordered[v_lead + v_confirmed_n + v_waitlist_n] := 1;
      end if;

      insert into public.sessions (class_type_id, instructor_id, starts_at, duration_minutes, capacity, status)
      values (v_slot.class_type_id, v_slot.instructor_id, v_starts, v_duration, v_slot.capacity,
              case when v_is_cancelled then 'cancelled' else 'scheduled' end)
      returning * into v_session;

      -- Todas las reservas se hicieron antes de hoy y antes de la clase, espaciadas unos 47 minutos.
      v_n := coalesce(array_length(v_ordered, 1), 0);
      v_base := least(v_starts - interval '1 day', p_now - interval '1 hour');
      v_last_confirmed := v_base - (v_n - (v_lead + v_confirmed_n) + 1) * interval '47 minutes';

      for i in 1..v_n loop
        select * into v_customer from private.demo_customers where idx = v_ordered[i];
        v_created := v_base - (v_n - i + 1) * interval '47 minutes';
        v_status := v_statuses[i];
        v_cancelled_at := null;
        v_promoted_at := null;
        v_attendance := null;
        v_code := case when v_customer.idx = v_showcase_idx then v_showcase_code else private.seed_code() end;
        v_source := case when random() < 0.12 then 'studio' else 'web' end;

        if v_status = 'cancelled' then
          v_cancelled_at := case when v_has_promotion and i = 1
            then v_last_confirmed + interval '20 minutes'
            else v_created + (v_base - v_created) / 2 end;
        end if;
        if v_has_promotion and v_status = 'confirmed' and v_created = v_last_confirmed then
          v_promoted_at := v_last_confirmed + interval '20 minutes';
        end if;
        if v_is_cancelled and v_status in ('confirmed', 'waitlisted') then
          v_status := 'class_cancelled';
          v_cancelled_at := least(v_starts - interval '4 hours', p_now - interval '30 minutes');
        end if;
        if v_ended and v_status = 'confirmed' then
          v_attendance := case when random() < 0.9 then 'attended' else 'no_show' end;
        end if;

        insert into public.bookings (session_id, code, name, email, phone, status, source, attendance,
                                     is_sample, created_at, cancelled_at, promoted_at)
        values (v_session.id, v_code, v_customer.name, v_customer.email, v_customer.phone, v_status, v_source,
                v_attendance, true, v_created, v_cancelled_at, v_promoted_at);
      end loop;
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Repone LUM-7K3Q (confirmada) y LUM-W8HT (en lista) si un visitante las canceló,
-- para que el siguiente pueda probarlas en «Mis reservas».
-- ---------------------------------------------------------------------
create or replace function private.restore_showcase()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_example record;
  v_customer private.demo_customers;
  v_booking public.bookings;
  v_target uuid;
begin
  for v_example in
    select * from (values ('LUM-7K3Q', 0, 'confirmed'), ('LUM-W8HT', 1, 'waitlisted')) as e(code, idx, status)
  loop
    select * into v_booking from public.bookings where code = v_example.code;
    continue when found and v_booking.status = v_example.status;

    if found then
      perform private.remove_booking(v_booking.id);
    end if;
    select * into v_customer from private.demo_customers where idx = v_example.idx;

    -- Una clase futura (a más de 24 h, para poder cancelarla) con plaza o llena, según el ejemplo.
    select s.id into v_target
    from public.sessions s
    where s.status = 'scheduled'
      and s.starts_at > now() + interval '24 hours'
      and not exists (select 1 from public.bookings b where b.session_id = s.id
                      and b.email = v_customer.email and b.status in ('confirmed', 'waitlisted'))
    order by
      ((select count(*) from public.bookings b where b.session_id = s.id and b.status = 'confirmed') >= s.capacity)
        = (v_example.status = 'waitlisted') desc,
      s.starts_at
    limit 1;

    if v_target is not null then
      perform private.place_booking(v_target, v_customer.name, v_customer.email, v_customer.phone,
                                    'web', null, true, v_example.code);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Restauración (cada hora) y restablecimiento (cada noche)
-- ---------------------------------------------------------------------
create or replace function private.restore_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_catalog();
  perform private.restore_demo_accounts();
  perform private.restore_showcase();
end;
$$;

create or replace function private.reset_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.bookings where true;
  delete from public.sessions where true;
  delete from public.lookup_attempts where true;
  perform private.seed_catalog();
  perform private.seed_demo(now());
  perform private.restore_demo();
end;
$$;

-- Lo que ejecuta pg_cron cada hora en punto. pg_cron trabaja en UTC; la hora de Madrid
-- se decide aquí, así funciona igual en horario de verano y de invierno.
create or replace function private.demo_hourly()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if extract(hour from now() at time zone 'Europe/Madrid') = 3 then
    perform private.reset_demo();
  else
    perform private.restore_demo();
  end if;
end;
$$;

revoke all on function
  private.seed_catalog(),
  private.seed_code(),
  private.seed_demo(timestamptz),
  private.restore_showcase(),
  private.restore_demo(),
  private.reset_demo(),
  private.demo_hourly()
from public, anon, authenticated;

-- Primera siembra
select private.reset_demo();
