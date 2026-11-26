import { neon } from '@neondatabase/serverless';

const SCHEMA = 3;
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
  await s`CREATE TABLE IF NOT EXISTS app_meta (k TEXT PRIMARY KEY, v INT NOT NULL)`;
  const [m] = await s`SELECT v FROM app_meta WHERE k = 'schema'`;
  if (m && m.v >= SCHEMA) return;

  await s`CREATE TABLE IF NOT EXISTS camionetas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    placas TEXT NOT NULL DEFAULT '',
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await s`CREATE TABLE IF NOT EXISTS empleados (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await s`CREATE TABLE IF NOT EXISTS camioneta_empleados (
    camioneta_id INT NOT NULL REFERENCES camionetas(id),
    empleado_id INT NOT NULL REFERENCES empleados(id),
    PRIMARY KEY (camioneta_id, empleado_id))`;
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
  await s`ALTER TABLE vueltas ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id)`;
  await s`ALTER TABLE gasolina ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id)`;
  await s`ALTER TABLE medidor ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id)`;
  await s`CREATE TABLE IF NOT EXISTS mantenimientos (
    id SERIAL PRIMARY KEY,
    camioneta_id INT NOT NULL REFERENCES camionetas(id),
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    costo NUMERIC(10,2),
    km INT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    proximo_fecha DATE,
    proximo_km INT,
    creado_por TEXT NOT NULL,
    editado_por TEXT,
    creado TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await s`CREATE TABLE IF NOT EXISTS mant_comentarios (
    id SERIAL PRIMARY KEY,
    mantenimiento_id INT NOT NULL REFERENCES mantenimientos(id) ON DELETE CASCADE,
    autor TEXT NOT NULL,
    texto TEXT NOT NULL,
    creado TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await s`CREATE INDEX IF NOT EXISTS vueltas_fecha ON vueltas (fecha)`;
  await s`CREATE INDEX IF NOT EXISTS gasolina_fecha ON gasolina (fecha)`;
  await s`CREATE INDEX IF NOT EXISTS mant_cam ON mantenimientos (camioneta_id)`;
  // v3: varias lecturas del medidor por camioneta y día (una por cada viaje)
  await s`CREATE TABLE IF NOT EXISTS lecturas (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL DEFAULT '',
    camioneta_id INT NOT NULL REFERENCES camionetas(id),
    km INT NOT NULL,
    empleado_id INT REFERENCES empleados(id),
    creado_por TEXT NOT NULL,
    editado_por TEXT,
    creado TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await s`CREATE INDEX IF NOT EXISTS lecturas_cam ON lecturas (camioneta_id, fecha)`;
  await s.transaction([
    s`SELECT pg_advisory_xact_lock(4242)`,
    s`INSERT INTO lecturas (fecha, hora, camioneta_id, km, empleado_id, creado_por, editado_por, creado)
      SELECT fecha, to_char(creado AT TIME ZONE 'America/Mexico_City', 'HH24:MI'), camioneta_id, km, empleado_id, creado_por, editado_por, creado
      FROM medidor WHERE NOT EXISTS (SELECT 1 FROM lecturas)`,
  ]);
  await s`INSERT INTO app_meta (k, v) VALUES ('schema', ${SCHEMA}) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
}
