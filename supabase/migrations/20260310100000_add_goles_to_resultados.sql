-- Añade goles por partido para poder mostrar el total de goles de la jornada (reales).
alter table public.resultados
  add column if not exists goles_local int,
  add column if not exists goles_visitante int;
