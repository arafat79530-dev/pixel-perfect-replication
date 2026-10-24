create or replace function public.admin_members()
returns table(user_id uuid, display_name text, email text, created_at timestamptz, status text, telegram_linked boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.email, p.created_at, m.status, (t.chat_id is not null)
  from public.profiles p
  left join public.memberships m on m.user_id = p.id
  left join public.telegram_links t on t.user_id = p.id
  where public.has_role(auth.uid(), 'admin')
  order by p.created_at desc
$$;

create or replace function public.get_ai_pause()
returns table(paused boolean, message text)
language sql
stable
security definer
set search_path = public
as $$
  select true, a.message
  from public.ai_access_pause a
  where a.id = true and public.has_role(auth.uid(), 'admin')
$$;

create or replace function public.set_ai_pause(paused boolean, message text default 'AI analysis is temporarily paused by the owner. / মালিক সাময়িকভাবে এআই বিশ্লেষণ বন্ধ রেখেছেন।')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden';
  end if;
  if paused then
    insert into public.ai_access_pause (id, message)
    values (true, coalesce(nullif(trim(message), ''), 'AI analysis is temporarily paused by the owner.'))
    on conflict (id) do update set message = excluded.message;
  else
    delete from public.ai_access_pause where id = true;
  end if;
end
$$;

revoke all on function public.admin_members() from public, anon;
revoke all on function public.get_ai_pause() from public, anon;
revoke all on function public.set_ai_pause(boolean, text) from public, anon;
grant execute on function public.admin_members() to authenticated;
grant execute on function public.get_ai_pause() to authenticated;
grant execute on function public.set_ai_pause(boolean, text) to authenticated;