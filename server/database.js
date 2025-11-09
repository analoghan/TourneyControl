const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'tournament.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      num_rings INTEGER NOT NULL,
      status TEXT DEFAULT 'not_started',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      ring_number INTEGER NOT NULL,
      current_event TEXT DEFAULT 'Forms',
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    )`);

    // Migration: Add status column to tournaments table if it doesn't exist
    db.all(`PRAGMA table_info(tournaments)`, (err, columns) => {
      if (err) {
        console.error('Error checking tournaments table schema:', err);
        return;
      }
      
      const hasStatusColumn = columns.some(col => col.name === 'status');
      
      if (!hasStatusColumn) {
        db.run(`ALTER TABLE tournaments ADD COLUMN status TEXT DEFAULT 'not_started'`, (err) => {
          if (err) {
            console.error('Error adding status column:', err);
          } else {
            console.log('Successfully added status column to tournaments table');
          }
        });
      }
    });

    // Migration: Add category columns to rings table if they don't exist
    db.all(`PRAGMA table_info(rings)`, (err, columns) => {
      if (err) {
        console.error('Error checking rings table schema:', err);
        return;
      }
      
      const hasGenderColumn = columns.some(col => col.name === 'gender');
      const hasAgeBracketColumn = columns.some(col => col.name === 'age_bracket');
      const hasRankColumn = columns.some(col => col.name === 'rank');
      const hasDivisionColumn = columns.some(col => col.name === 'division');
      
      if (!hasGenderColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN gender TEXT DEFAULT 'Male'`, (err) => {
          if (err) {
            console.error('Error adding gender column:', err);
          } else {
            console.log('Successfully added gender column to rings table');
          }
        });
      }
      
      if (!hasAgeBracketColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN age_bracket TEXT DEFAULT 'Tigers'`, (err) => {
          if (err) {
            console.error('Error adding age_bracket column:', err);
          } else {
            console.log('Successfully added age_bracket column to rings table');
          }
        });
      }
      
      if (!hasRankColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN rank TEXT DEFAULT 'Color Belts'`, (err) => {
          if (err) {
            console.error('Error adding rank column:', err);
          } else {
            console.log('Successfully added rank column to rings table');
          }
        });
      }
      
      if (!hasDivisionColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN division TEXT DEFAULT 'Bantam'`, (err) => {
          if (err) {
            console.error('Error adding division column:', err);
          } else {
            console.log('Successfully added division column to rings table');
          }
        });
      }
    });
  });
}

module.exports = db;
