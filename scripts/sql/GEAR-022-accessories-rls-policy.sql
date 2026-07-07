alter table public.headfi_accessories
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table public.headfi_accessories
  alter column user_id set default auth.uid();

alter table public.headfi_accessories enable row level security;

drop policy if exists "headfi_accessories_select_own" on public.headfi_accessories;
create policy "headfi_accessories_select_own"
on public.headfi_accessories
for select
using (auth.uid() = user_id);

drop policy if exists "headfi_accessories_insert_own" on public.headfi_accessories;
create policy "headfi_accessories_insert_own"
on public.headfi_accessories
for insert
with check (auth.uid() = user_id);

drop policy if exists "headfi_accessories_update_own" on public.headfi_accessories;
create policy "headfi_accessories_update_own"
on public.headfi_accessories
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "headfi_accessories_delete_own" on public.headfi_accessories;
create policy "headfi_accessories_delete_own"
on public.headfi_accessories
for delete
using (auth.uid() = user_id);
