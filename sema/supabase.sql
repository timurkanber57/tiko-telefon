-- TİKO Telefon — bulut şeması (Supabase/Postgres). Henüz kurulmadı; bulut aşamasında SQL Editor'de çalıştırılır.
-- KURAL: Telefonda yalnızca anon/publishable anahtar + kullanıcı oturum token'ı olur. service_role anahtarı ASLA telefona/GitHub'a konmaz.

create table if not exists telefon_katalog (        -- TİKO masaüstü yazar, telefon okur
  id text primary key, ad text not null, fiyat numeric(14,2) not null default 0, alis numeric(14,2), birim text default 'Adet',
  barkodlar text[] not null default '{}', stok jsonb,            -- stok: {"eraslan": 12, "kitapkafasi": 3}
  guncellendi timestamptz not null default now());
create index if not exists telefon_katalog_barkod on telefon_katalog using gin (barkodlar);

create table if not exists telefon_satis (           -- telefon yazar (id = telefonda üretilen UUID → tekrar gönderme çift kayıt yapmaz)
  id uuid primary key, cihaz_id uuid not null, sirket text not null check (sirket in ('eraslan','kitapkafasi')),
  veri jsonb not null, olusturuldu timestamptz not null, alindi timestamptz not null default now(), tiko_isledi boolean not null default false);

create table if not exists telefon_sayim (
  id uuid primary key, cihaz_id uuid not null, sirket text not null check (sirket in ('eraslan','kitapkafasi')),
  veri jsonb not null, olusturuldu timestamptz not null, alindi timestamptz not null default now(), tiko_isledi boolean not null default false);

alter table telefon_katalog enable row level security;
alter table telefon_satis   enable row level security;
alter table telefon_sayim   enable row level security;

-- Yalnızca giriş yapmış (authenticated) kullanıcılar. Mağaza personeli kullanıcıları Supabase Auth'ta elle açılır, kayıt (signup) kapalı olmalı.
create policy katalog_oku  on telefon_katalog for select to authenticated using (true);
create policy satis_ekle   on telefon_satis   for insert to authenticated with check (true);
create policy satis_oku    on telefon_satis   for select to authenticated using (true);
create policy sayim_ekle   on telefon_sayim   for insert to authenticated with check (true);
create policy sayim_oku    on telefon_sayim   for select to authenticated using (true);
-- Telefon satış/sayım kaydını silemez/değiştiremez (update/delete politikası yok). Katalog yazma yalnızca TİKO (service_role, sadece masaüstünde) ile.
