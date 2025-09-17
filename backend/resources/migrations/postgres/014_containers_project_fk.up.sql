BEGIN;
DO $$
DECLARE cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_name = kcu.table_name
  WHERE tc.table_name = 'containers' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'stack_id';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE containers DROP CONSTRAINT %I', cname);
  END IF;
END$$;

ALTER TABLE containers
  RENAME COLUMN IF EXISTS stack_id TO project_id;

-- Create FK to projects if table exists
ALTER TABLE IF EXISTS containers
  ADD CONSTRAINT containers_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
COMMIT;