-- Expected: four rows, rls_enabled=true, anonymous_has_access=false.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (has_table_privilege('anon', c.oid, 'SELECT')
        or has_table_privilege('anon', c.oid, 'INSERT')
        or has_table_privilege('anon', c.oid, 'UPDATE')
        or has_table_privilege('anon', c.oid, 'DELETE')) as anonymous_has_access
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('clinics', 'staff_members', 'enquiries', 'enquiry_notes')
order by c.relname;
