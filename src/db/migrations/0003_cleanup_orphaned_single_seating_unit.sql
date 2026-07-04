-- Custom SQL migration file, put your code below! --
-- Invariante: toda seating_unit 'single' pertenece exactamente a una mesa y
-- debe desaparecer con ella. Esto cubre TODO camino de borrado de una mesa
-- (DELETE directo, o cascada desde zone/restaurant), no solo el que pasa por
-- la app. BEFORE DELETE porque en ese momento seating_unit_mesa todavía tiene
-- el vínculo (el cascade sobre seating_unit_mesa.mesa_id todavía no corrió).
CREATE OR REPLACE FUNCTION delete_orphaned_single_seating_unit() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM seating_unit
  WHERE kind = 'single'
    AND id IN (
      SELECT seating_unit_id FROM seating_unit_mesa WHERE mesa_id = OLD.id
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mesa_delete_cleanup_single_unit
BEFORE DELETE ON mesa
FOR EACH ROW
EXECUTE FUNCTION delete_orphaned_single_seating_unit();
