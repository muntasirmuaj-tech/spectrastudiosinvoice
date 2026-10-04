create table public.settings (
  owner_id uuid primary key default auth.uid(),
  business_name text not null default 'Spectra Studios',
  business_type text not null default 'Digital Services Agency',
  address text default '', phone text default '', email text default '', website text default '', tax_id text default '',
  logo_url text,
  currency_symbol text not null default '৳',
  invoice_prefix text not null default 'SS',
  next_number int not null default 1,
  default_due_days int not null default 7,
  default_note text not null default 'Thank you for choosing Spectra Studios.',
  payment_methods jsonb not null default '{"bank":{"enabled":true,"bank_name":"","account_name":"","account_number":"","branch":"","routing":"","qr_url":null},"bkash":{"enabled":false,"account_name":"","number":"","qr_url":null},"nagad":{"enabled":true,"account_name":"","number":"","qr_url":null},"cash":{"enabled":false}}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null, company text default '', email text default '', phone text default '', address text default '', notes text default '',
  archived boolean not null default false, is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null, description text default '', rate numeric not null default 0,
  archived boolean not null default false, is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  number text not null,
  client_id uuid references public.clients(id) on delete set null,
  client_snapshot jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  invoice_date date not null default current_date,
  due_date date not null default current_date + 7,
  discount_type text not null default 'fixed',
  discount_value numeric not null default 0,
  tax_rate numeric not null default 0,
  status_override text,
  is_draft boolean not null default false,
  notes text default '', internal_notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, number)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric not null, method text not null default 'Bank',
  paid_on date not null default current_date, reference text default '', notes text default '',
  created_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['settings','clients','services','invoices','payments'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;

create or replace function public.ensure_workspace() returns void
language plpgsql security invoker set search_path = public as $$
begin
  if exists (select 1 from settings where owner_id = auth.uid()) then return; end if;
  insert into settings default values;
  insert into clients (name, company, email, is_demo) values
    ('Rahim Ahmed','ABC Media','hello@abcmedia.example',true),
    ('Nusrat Jahan','Northstar Media','billing@northstar.example',true),
    ('Example Client','Example Co.','client@example.com',true);
  insert into services (name, description, rate, is_demo) values
    ('Logo Design','Custom logo with 3 concepts',15000,true),
    ('Brand Identity','Logo, palette, typography & guidelines',30000,true),
    ('Video Editing','Per edited video',5000,true),
    ('Social Media Design','Per post design',2000,true),
    ('Motion Graphics','Per animated piece',8000,true);
end $$;
grant execute on function public.ensure_workspace() to authenticated;