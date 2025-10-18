// database.js - Módulo de base de datos
require('dotenv').config();

const Database = require('better-sqlite3');
const { info } = require('console');

const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    // Verificar si es la primera vez
    const esNuevaDB = !fs.existsSync(process.env.DB_NAME);
    
    // Crear o abrir la base de datos
    this.db = new Database(process.env.DB_NAME);
    
    // Habilitar claves foráneas
    this.db.pragma('foreign_keys = ON');
    
    // Si es nueva, inicializar
    if (esNuevaDB) {
      console.log('🆕 Base de datos nueva detectada. Inicializando...');
      this.inicializar();
    } else {
      console.log('✅ Conectado a base de datos existente');
    }
  }

  // Se ejecuta SOLO la primera vez
  inicializar() {
    console.log('📝 Creando estructura de tablas...');
    
    // Crear tablas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (:""
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        edad INTEGER,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_email ON usuarios(email);
    `);

    // Insertar datos iniciales (seed data)
    const insertConfig = this.db.prepare(
      'INSERT INTO configuracion (clave, valor) VALUES (?, ?)'
    );
    
    insertConfig.run('version_db', '1.0');
    insertConfig.run('fecha_creacion', new Date().toISOString());
    
    console.log('✅ Base de datos inicializada correctamente');
  }

  // CRUD de usuarios
  registrarUsuario(nombre, email, edad) {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO usuarios (nombre, email, edad) VALUES (?, ?, ?)'
      );
      const info = stmt.run(nombre, email, edad);
      return { success: true, id: info.lastInsertRowid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  consultarPorId(id) {
    const stmt = this.db.prepare('SELECT * FROM usuarios WHERE id = ?');
    return stmt.get(id);
  }


  // Método para cerrar la conexión
  cerrar() {
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

module.exports = { getDatabase, DatabaseManager };
