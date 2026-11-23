import { neon } from '@neondatabase/serverless';

let sql;
let ready;

export async function db() {
  if (!sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('Falta DATABASE_URL');
    sql = neon(url);
  }
  if (!ready) ready = init(sql).catch((e) => { ready = null; throw e; });
  await ready;
  return sql;
}

async function init(s) {
  await s`CREATE TABLE IF NOT EXISTS camionetas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    placas TEXT NOT NULL DEFAULT '',
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await s`CREATE TABLE IF NOT EXISTS vueltas (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    camioneta_id INT NOT NULL REFERENCES camionetas(id),
    destino TEXT NOT NULL DEFAULT '',
    creado_por TEXT NOT NULL,
    editado_por TEXT,
    creado TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await s`CREATE TABLE IF NOT EXISTS gasolina (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    camioneta_id INT NOT NULL REFERENCES camionetas(id),
    monto NUMERIC(10,2) NOT NULL,
    litros NUMERIC(8,2),
    creado_por TEXT NOT NULL,
    editado_por TEXT,
    creado TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await s`CREATE TABLE IF NOT EXISTS medidor (
    fecha DATE NOT NULL,
    camioneta_id INT NOT NULL REFERENCES camionetas(id),
    km INT NOT NULL,
    creado_por TEXT NOT NULL,
    editado_por TEXT,
    creado TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (fecha, camioneta_id))`;
  await s`CREATE INDEX IF NOT EXISTS vueltas_fecha ON vueltas (fecha)`;
  await s`CREATE INDEX IF NOT EXISTS gasolina_fecha ON gasolina (fecha)`;
}
