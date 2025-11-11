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
      timezone TEXT DEFAULT 'America/New_York',
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
      const hasColorBeltsColumn = columns.some(col => col.name === 'color_belts');
      
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
      
      if (!hasColorBeltsColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN color_belts TEXT DEFAULT '[]'`, (err) => {
          if (err) {
            console.error('Error adding color_belts column:', err);
          } else {
            console.log('Successfully added color_belts column to rings table');
          }
        });
      }
      
      const hasBlackBeltsColumn = columns.some(col => col.name === 'black_belts');
      
      if (!hasBlackBeltsColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN black_belts TEXT DEFAULT '[]'`, (err) => {
          if (err) {
            console.error('Error adding black_belts column:', err);
          } else {
            console.log('Successfully added black_belts column to rings table');
          }
        });
      }
      
      const hasStackedRingColumn = columns.some(col => col.name === 'stacked_ring');
      
      if (!hasStackedRingColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN stacked_ring INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding stacked_ring column:', err);
          } else {
            console.log('Successfully added stacked_ring column to rings table');
          }
        });
      }
      
      const hasSpecialAbilitiesPhysicalColumn = columns.some(col => col.name === 'special_abilities_physical');
      const hasSpecialAbilitiesCognitiveColumn = columns.some(col => col.name === 'special_abilities_cognitive');
      const hasSpecialAbilitiesAutisticColumn = columns.some(col => col.name === 'special_abilities_autistic');
      
      if (!hasSpecialAbilitiesPhysicalColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN special_abilities_physical INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding special_abilities_physical column:', err);
          } else {
            console.log('Successfully added special_abilities_physical column to rings table');
          }
        });
      }
      
      if (!hasSpecialAbilitiesCognitiveColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN special_abilities_cognitive INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding special_abilities_cognitive column:', err);
          } else {
            console.log('Successfully added special_abilities_cognitive column to rings table');
          }
        });
      }
      
      if (!hasSpecialAbilitiesAutisticColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN special_abilities_autistic INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding special_abilities_autistic column:', err);
          } else {
            console.log('Successfully added special_abilities_autistic column to rings table');
          }
        });
      }
      
      const hasJudgesNeededColumn = columns.some(col => col.name === 'judges_needed');
      
      if (!hasJudgesNeededColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN judges_needed INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding judges_needed column:', err);
          } else {
            console.log('Successfully added judges_needed column to rings table');
          }
        });
      }
      
      const hasIsOpenColumn = columns.some(col => col.name === 'is_open');
      
      if (!hasIsOpenColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN is_open INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding is_open column:', err);
          } else {
            console.log('Successfully added is_open column to rings table');
          }
        });
      }
      
      const hasAgeBracketsColumn = columns.some(col => col.name === 'age_brackets');
      
      if (!hasAgeBracketsColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN age_brackets TEXT DEFAULT '["Tigers"]'`, (err) => {
          if (err) {
            console.error('Error adding age_brackets column:', err);
          } else {
            console.log('Successfully added age_brackets column to rings table');
          }
        });
      }
      
      const hasDivisionTypeColumn = columns.some(col => col.name === 'division_type');
      
      if (!hasDivisionTypeColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN division_type TEXT DEFAULT 'Champion'`, (err) => {
          if (err) {
            console.error('Error adding division_type column:', err);
          } else {
            console.log('Successfully added division_type column to rings table');
          }
        });
      }
      
      const hasStartTimeColumn = columns.some(col => col.name === 'start_time');
      
      if (!hasStartTimeColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN start_time DATETIME`, (err) => {
          if (err) {
            console.error('Error adding start_time column:', err);
          } else {
            console.log('Successfully added start_time column to rings table');
          }
        });
      }
      
      const hasEndTimeColumn = columns.some(col => col.name === 'end_time');
      
      if (!hasEndTimeColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN end_time DATETIME`, (err) => {
          if (err) {
            console.error('Error adding end_time column:', err);
          } else {
            console.log('Successfully added end_time column to rings table');
          }
        });
      }
      
      const hasRttlNeededColumn = columns.some(col => col.name === 'rttl_needed');
      
      if (!hasRttlNeededColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN rttl_needed INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding rttl_needed column:', err);
          } else {
            console.log('Successfully added rttl_needed column to rings table');
          }
        });
      }
    });
    
    // Migration: Add timezone column to tournaments table if it doesn't exist
    db.all(`PRAGMA table_info(tournaments)`, (err, columns) => {
      if (err) {
        console.error('Error checking tournaments table schema:', err);
        return;
      }
      
      const hasTimezoneColumn = columns.some(col => col.name === 'timezone');
      
      if (!hasTimezoneColumn) {
        db.run(`ALTER TABLE tournaments ADD COLUMN timezone TEXT DEFAULT 'America/New_York'`, (err) => {
          if (err) {
            console.error('Error adding timezone column:', err);
          } else {
            console.log('Successfully added timezone column to tournaments table');
          }
        });
      }
    });
  });
}

module.exports = db;
