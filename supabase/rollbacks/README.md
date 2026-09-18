# Migration rollbacks

Each file must match its forward migration filename. State destructive effects in
a SQL comment at the top and make object removal conditional where practical.
Always create and verify a backup before applying a production rollback.
