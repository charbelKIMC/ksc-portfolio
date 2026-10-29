// Connexion à PostgreSQL (Neon) par HTTP : adaptée aux fonctions serverless, pas de connexion à garder ouverte.
import { neon } from '@neondatabase/serverless';

let sql;
let override;

// query('select … where id = $1', [id]) → tableau de lignes
export function query(text, params = []) {
  if (override) return override(text, params);
  if (!process.env.DATABASE_URL) throw new Error('Variable DATABASE_URL manquante.');
  sql ??= neon(process.env.DATABASE_URL);
  return sql.query(text, params);
}

// Remplace la base par une autre fonction query (base en mémoire du serveur local et des tests).
export function useQuery(fn) {
  override = fn;
}
