const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'tournament.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    migrateDatabase();
  }
});

function migrateDatabase() {
  console.log('Creating stacked_rings table...');
  
  db.run(`CREATE TABLE IF NOT EXISTS stacked_rings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ring_id INTEGER NOT NULL,
    stack_order INTEGER NOT NULL,
    current_event TEXT DEFAULT 'Forms',
    gender TEXT DEFAULT 'Male',
    age_bracket TEXT DEFAULT '8 and Under',
    age_brackets TEXT DEFAULT '["8 and Under"]',
    rank TEXT DEFAULT 'Color Belts',
    division TEXT DEFAULT 'Bantam',
    division_type TEXT DEFAULT 'Champion',
    color_belts TEXT DEFAULT '[]',
    black_belts TEXT DEFAULT '[]',
    special_abilities_physical INTEGER DEFAULT 0,
    special_abilities_cognitive INTEGER DEFAULT 0,
    special_abilities_autistic INTEGER DEFAULT 0,
    competitor_count INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ring_id) REFERENCES rings(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating stacked_rings table:', err);
      process.exit(1);
    } else {
      console.log('Successfully created stacked_rings table');
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Migration complete!');
        }
        process.exit(0);
      });
    }
  });
}
