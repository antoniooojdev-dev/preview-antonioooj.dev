-- ─────────────────────────────────────────────────────────────
--  aj_garage · instalación
--  QBCore: no necesita cambios (usa player_vehicles tal cual).
--  ESX:    owned_vehicles necesita las columnas `parking` y `pound`
--          (esx_legacy ya las trae; esto solo las añade si faltan).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE `owned_vehicles`
    ADD COLUMN IF NOT EXISTS `parking` VARCHAR(60) NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `pound`   VARCHAR(60) NULL DEFAULT NULL;

-- Índice para que el listado por jugador sea instantáneo
CREATE INDEX IF NOT EXISTS `idx_owned_vehicles_owner` ON `owned_vehicles` (`owner`);
