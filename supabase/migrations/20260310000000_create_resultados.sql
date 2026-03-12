-- Resultados reales por partido para marcar aciertos. Se llenan desde la Edge Function sync-resultados (ESPN).
create table if not exists public.resultados (
  temporada text not null,
  jornada int not null,
  partido_id int not null,
  resultado text not null check (resultado in ('1', 'X', '2')),
  primary key (temporada, jornada, partido_id)
);

alter table public.resultados enable row level security;

drop policy if exists "Lectura resultados para autenticados" on public.resultados;
create policy "Lectura resultados para autenticados"
  on public.resultados for select to authenticated using (true);
