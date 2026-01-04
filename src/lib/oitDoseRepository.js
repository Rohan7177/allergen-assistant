'use server';

import { withConnection } from './db';

const ALLERGEN_SEED = [
  'Peanuts',
  'Pistachios',
  'Tree Nuts',
  'Eggs',
  'Shellfish',
  'Wheat',
  'Cashews',
  'Almonds',
  'Milk',
  'Fish',
  'Soy',
  'Gluten',
];

const REACTION_LEVELS = new Set(['none', 'mild', 'severe']);

let schemaReadyPromise;

async function ensureSchema(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS oit_allergens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      label VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS oit_dose_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      allergen_id INT NOT NULL,
      dose_mg DECIMAL(10,2) NOT NULL,
      reaction ENUM('none','mild','severe') NOT NULL,
      notes TEXT NULL,
      logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (allergen_id) REFERENCES oit_allergens(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const insertValues = ALLERGEN_SEED.map((label) => [
    label.toLowerCase(),
    label,
  ]);

  await connection.query(
    `INSERT INTO oit_allergens (code, label) VALUES ${insertValues
      .map(() => '(?, ?)')
      .join(', ')}
     ON DUPLICATE KEY UPDATE label = VALUES(label), updated_at = CURRENT_TIMESTAMP`,
    insertValues.flat()
  );
}

function ensureSchemaReady() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = withConnection(async (connection) => {
      await ensureSchema(connection);
      return true;
    }).catch((error) => {
      schemaReadyPromise = undefined;
      throw error;
    });
  }
  return schemaReadyPromise;
}

export async function fetchDoseLogs() {
  await ensureSchemaReady();

  return withConnection(async (connection) => {
    const [rows] = await connection.query(
      `SELECT logs.id,
              logs.dose_mg AS doseMg,
              logs.reaction,
              logs.logged_at AS loggedAt,
              logs.updated_at AS updatedAt,
              allergens.label AS allergenLabel,
              allergens.code AS allergenCode
         FROM oit_dose_logs AS logs
         INNER JOIN oit_allergens AS allergens ON allergens.id = logs.allergen_id
         ORDER BY logs.logged_at DESC, logs.id DESC`
    );

    return rows.map((row) => ({
      id: row.id,
      allergenLabel: row.allergenLabel,
      allergenCode: row.allergenCode,
      doseMg: Number(row.doseMg),
      reaction: row.reaction,
      loggedAt: row.loggedAt,
      updatedAt: row.updatedAt,
    }));
  });
}

async function resolveAllergenId(connection, allergenCode) {
  const normalized = typeof allergenCode === 'string' ? allergenCode.trim().toLowerCase() : '';

  if (!normalized) {
    throw new Error('Invalid allergen code.');
  }

  const [rows] = await connection.query(
    'SELECT id FROM oit_allergens WHERE code = ? LIMIT 1',
    [normalized]
  );

  if (!rows.length) {
    throw new Error('Unknown allergen code.');
  }

  return rows[0].id;
}

function validateDosePayload({ allergenCode, doseMg, reaction }) {
  const normalizedCode = typeof allergenCode === 'string' ? allergenCode.trim().toLowerCase() : '';
  const numericDose = typeof doseMg === 'number' ? doseMg : Number.parseFloat(doseMg);
  const normalizedReaction = typeof reaction === 'string' ? reaction.trim().toLowerCase() : '';

  if (!normalizedCode) {
    throw new Error('Allergen selection is required.');
  }

  if (!Number.isFinite(numericDose) || numericDose <= 0) {
    throw new Error('Dose amount must be a positive number.');
  }

  if (!REACTION_LEVELS.has(normalizedReaction)) {
    throw new Error('Reaction value must be one of none, mild, or severe.');
  }

  return { allergenCode: normalizedCode, doseMg: numericDose, reaction: normalizedReaction };
}

export async function createDoseLog(payload) {
  await ensureSchemaReady();
  const validated = validateDosePayload(payload);

  return withConnection(async (connection) => {
    const allergenId = await resolveAllergenId(connection, validated.allergenCode);

    const [result] = await connection.query(
      `INSERT INTO oit_dose_logs (allergen_id, dose_mg, reaction)
       VALUES (?, ?, ?)`
      , [allergenId, validated.doseMg, validated.reaction]
    );

    return {
      id: result.insertId,
      ...validated,
    };
  });
}

export async function updateDoseLog(id, payload) {
  await ensureSchemaReady();
  const validated = validateDosePayload(payload);

  return withConnection(async (connection) => {
    const allergenId = await resolveAllergenId(connection, validated.allergenCode);

    const [result] = await connection.query(
      `UPDATE oit_dose_logs
          SET allergen_id = ?, dose_mg = ?, reaction = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      , [allergenId, validated.doseMg, validated.reaction, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Dose log not found.');
    }

    return { id, ...validated };
  });
}

export async function deleteDoseLog(id) {
  await ensureSchemaReady();

  return withConnection(async (connection) => {
    const [result] = await connection.query(
      'DELETE FROM oit_dose_logs WHERE id = ?'
      , [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Dose log not found.');
    }

    return { success: true };
  });
}

export async function fetchAllergens() {
  await ensureSchemaReady();

  return withConnection(async (connection) => {
    const [rows] = await connection.query(
      'SELECT code, label FROM oit_allergens ORDER BY label ASC'
    );

    return rows.map((row) => ({
      code: row.code,
      label: row.label,
    }));
  });
}
