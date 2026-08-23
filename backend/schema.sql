create extension if not exists vector;
create extension if not exists "uuid-ossp";

create type role as enum ('RESIDENT', 'ADMIN');
create type priority as enum ('LOW', 'MEDIUM', 'HIGH');
create type status as enum ('OPEN', 'IN_PROGRESS', 'RESOLVED');
create type category as enum ('PLUMBING','ELECTRICAL','ELEVATOR','SECURITY','CLEANING','GARDENING','OTHER');

create table users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique not null,          -- maps to Supabase auth.users.id
  email text unique not null,
  name text not null,
  flat_number text,
  phone text,
  role role not null default 'RESIDENT',
  created_at timestamptz not null default now()
);

create table complaints (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  category category not null,
  status status not null default 'OPEN',
  priority priority not null default 'MEDIUM',
  photo_url text,
  cv_verified boolean default false,        -- CV check: does photo match category?
  cv_confidence numeric(4,3),
  ai_suggested_category category,           -- NLP triage output, kept even if admin overrides
  ai_suggested_priority priority,
  resident_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table complaint_history (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid not null references complaints(id) on delete cascade,
  actor_id uuid not null references users(id),
  old_status status,
  new_status status not null,
  old_priority priority,
  new_priority priority,
  note text,
  timestamp timestamptz not null default now()
);

create table notices (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  is_important boolean not null default false,
  author_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table society_config (
  id uuid primary key default uuid_generate_v4(),
  overdue_threshold_days int not null default 3,
  updated_at timestamptz not null default now()
);

-- RAG: embeddings for resolved tickets and community guidelines
create table knowledge_embeddings (
  id uuid primary key default uuid_generate_v4(),
  source_type text not null check (source_type in ('RESOLVED_TICKET','GUIDELINE')),
  source_id uuid,                          -- complaint_id when source_type = RESOLVED_TICKET
  content text not null,                   -- the text that was embedded
  embedding vector(384) not null,          -- 384-dim if using a small sentence-transformers model
  created_at timestamptz not null default now()
);

-- indexes
create index idx_complaints_status on complaints(status);
create index idx_complaints_category on complaints(category);
create index idx_complaints_created_at on complaints(created_at);
create index idx_history_complaint_id on complaint_history(complaint_id);
create index idx_embeddings_vector on knowledge_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Enable RLS
alter table complaints enable row level security;
alter table complaint_history enable row level security;
alter table notices enable row level security;

-- Policies (assuming auth.uid() corresponds to users.auth_id and we have a function to get role)
-- Note: Further RLS functions may be needed depending on how the application handles requests,
-- but FastAPI will also act as a privileged service connecting via service role key.
