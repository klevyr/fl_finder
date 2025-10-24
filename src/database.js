// database.js - Módulo de base de datos
import dotenv from 'dotenv';

import Database from 'better-sqlite3';
import { info } from 'console';

import { existsSync } from 'fs';
import path from 'path';

class DatabaseManager {
  constructor() {
    // Verificar si es la primera vez
    const isNewDB = !existsSync(process.env.DB_NAME);
    
    // Crear o abrir la base de datos
    this.db = new Database(process.env.DB_NAME);
    this.db.pragma('foreign_keys = ON');
    
    if (isNewDB) {
      console.log('🆕 Base de datos nueva detectada. Inicializando...');
      this.initDB();
    } else {
      console.log('✅ Conectado a base de datos existente');
    }
  }

  // Se ejecuta SOLO la primera vez
  initDB() {
    console.log('📝 Creando estructura de tablas...');
    
    // Crear tablas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS freelance_joblist (:""
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobid TEXT NOT NULL
        date_create DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS freelance_config (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_jobid ON freelance_joblist(jobid);
    `);

    // Insertar datos iniciales (seed data)
    const insertConfig = this.db.prepare(
      'INSERT INTO freelance_config (id, value) VALUES (?, ?)'
    );
    
    insertConfig.run('version_db', '1.0');
    insertConfig.run('db_created_date', new Date().toISOString());
    
    console.log('✅ Base de datos inicializada correctamente');
  }

  // CRUD de usuarios
  setFreelanceJob(jobid) {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO freelance_joblist (jobid) VALUES (?)'
      );
      const info = stmt.run(jobid);
      return { success: true, id: info.lastInsertRowid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getJobId(jid) {
    const stmt = this.db.prepare('SELECT * FROM freelance_joblist WHERE jobid = ?');
    return stmt.get(jid);
  }


  // Método para cerrar la conexión
  closeDb() {
    this.db.close();
    console.log('🔒 Conexión cerrada');
  }
}
// Exportar instancia singleton
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  return dbInstance;
}

export default { getDatabase, DatabaseManager };
