-- Custom SQL migration file, put your code below! --
-- Anti doble-booking: dos filas para la misma mesa no pueden tener 'periodo'
-- solapado. btree_gist habilita el operador '=' dentro de un índice GiST.
ALTER TABLE "reservation_mesa"
  ADD CONSTRAINT "sin_solape" EXCLUDE USING gist ("mesa_id" WITH =, "periodo" WITH &&);
