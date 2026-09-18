# Database migrations

Use ordered names such as `001_create_accounts.sql`. Every migration must:

- be transactional where PostgreSQL permits;
- be safe to run once and tracked by the migration ledger;
- enable RLS on every new application table;
- define explicit policies for each supported role and operation;
- avoid embedding credentials or environment-specific identifiers;
- have a reviewed counterpart with the same filename in `../rollbacks/`.

Example table security baseline:

```sql
alter table public.example enable row level security;
alter table public.example force row level security;
revoke all on public.example from anon, authenticated;
```

Add narrowly scoped grants and policies only after documenting the authorization
rule. Do not use an unconditional `using (true)` policy in production.
