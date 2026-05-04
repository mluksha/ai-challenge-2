create or replace function public.handle_new_host()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.host_members (host_id, user_id, role)
  values (NEW.id, NEW.created_by, 'host')
  on conflict do nothing;
  return NEW;
end;
$$;

drop trigger if exists on_host_created on public.hosts;
create trigger on_host_created
after insert on public.hosts
for each row execute function public.handle_new_host();