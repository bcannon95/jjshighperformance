-- The clients table was imported from Trainerize, so its id column has no
-- auto-increment default. This migration attaches a sequence so that new
-- clients created through the admin portal get a valid id automatically.

CREATE SEQUENCE IF NOT EXISTS clients_id_seq;

-- Start the sequence above the current highest id so there are no collisions.
SELECT setval(
  'clients_id_seq',
  COALESCE((SELECT MAX(id) FROM clients), 0) + 1,
  false
);

ALTER TABLE clients
  ALTER COLUMN id SET DEFAULT nextval('clients_id_seq');
