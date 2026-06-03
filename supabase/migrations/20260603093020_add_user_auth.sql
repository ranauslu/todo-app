-- Görevleri kullanıcıya bağla
alter table todos
  add column if not exists user_id uuid
  references auth.users(id) on delete cascade
  default auth.uid();

-- Eski "herkese açık" politikayı kaldır
drop policy if exists "anon_todos_all" on todos;

-- Her giriş yapmış kullanıcı YALNIZCA kendi görevlerini görür/yönetir
create policy "kendi gorevlerini gor"
  on todos for select to authenticated
  using (auth.uid() = user_id);

create policy "kendi gorevini ekle"
  on todos for insert to authenticated
  with check (auth.uid() = user_id);

create policy "kendi gorevini guncelle"
  on todos for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "kendi gorevini sil"
  on todos for delete to authenticated
  using (auth.uid() = user_id);
