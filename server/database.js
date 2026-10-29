const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'tournament.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    // Wait briefly instead of failing if a backup snapshot is reading the file at the same moment
    db.configure('busyTimeout', 5000);
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // SQLite ignores FOREIGN KEY / ON DELETE CASCADE unless this is enabled on each connection
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) console.error('Error enabling foreign keys:', err);
    });

    db.run(`CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      num_rings INTEGER NOT NULL,
      status TEXT DEFAULT 'not_started',
      timezone TEXT DEFAULT 'America/New_York',
      stacked_ring_display TEXT DEFAULT 'multiple',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      ring_number INTEGER NOT NULL,
      current_event TEXT DEFAULT 'Forms',
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS judges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      ata_number TEXT NOT NULL,
      rank TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT DEFAULT 'Male',
      judging_level TEXT NOT NULL,
      competing INTEGER DEFAULT 0,
      competing_creative_xma INTEGER DEFAULT 0,
      competing_teams INTEGER DEFAULT 0,
      teams_coach INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ring_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ring_id INTEGER NOT NULL,
      session_number INTEGER NOT NULL,
      start_time DATETIME,
      end_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ring_id) REFERENCES rings(id) ON DELETE CASCADE
    )`);

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
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      sender_name TEXT DEFAULT 'Staff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tournament_judges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      judge_id INTEGER NOT NULL,
      checked_in INTEGER DEFAULT 0,
      check_in_time DATETIME,
      currently_competing INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (judge_id) REFERENCES judges(id) ON DELETE CASCADE,
      UNIQUE(tournament_id, judge_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ring_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ring_id INTEGER NOT NULL,
      judge_id INTEGER NOT NULL,
      tournament_id INTEGER NOT NULL,
      position TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ring_id) REFERENCES rings(id) ON DELETE CASCADE,
      FOREIGN KEY (judge_id) REFERENCES judges(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      UNIQUE(ring_id, position)
    )`);

    // Migration: Add ata_number column to judges table if it doesn't exist
    db.all(`PRAGMA table_info(judges)`, (err, columns) => {
      if (err) {
        console.error('Error checking judges table schema:', err);
        return;
      }
      
      const hasAtaNumberColumn = columns.some(col => col.name === 'ata_number');
      
      if (!hasAtaNumberColumn) {
        db.run(`ALTER TABLE judges ADD COLUMN ata_number TEXT DEFAULT ''`, (err) => {
          if (err) {
            console.error('Error adding ata_number column:', err);
          } else {
            console.log('Successfully added ata_number column to judges table');
          }
        });
      }
    });

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
        db.run(`ALTER TABLE rings ADD COLUMN age_brackets TEXT DEFAULT '["8 and Under"]'`, (err) => {
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
      
      const hasCompetitorCountColumn = columns.some(col => col.name === 'competitor_count');
      
      if (!hasCompetitorCountColumn) {
        db.run(`ALTER TABLE rings ADD COLUMN competitor_count INTEGER DEFAULT 1`, (err) => {
          if (err) {
            console.error('Error adding competitor_count column:', err);
          } else {
            console.log('Successfully added competitor_count column to rings table');
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

    // Migration: Add currently_competing to tournament check-ins (a judge who is competing can't judge for now)
    db.all(`PRAGMA table_info(tournament_judges)`, (err, columns) => {
      if (err) {
        console.error('Error checking tournament_judges table schema:', err);
        return;
      }

      if (!columns.some(col => col.name === 'currently_competing')) {
        db.run(`ALTER TABLE tournament_judges ADD COLUMN currently_competing INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Error adding currently_competing column:', err);
          } else {
            console.log('Successfully added currently_competing column to tournament_judges table');
          }
        });
      }
    });

    // Migration: Add stacked_ring_display column to tournaments ('multiple' = one card per stack, 'single' = one card per ring)
    db.all(`PRAGMA table_info(tournaments)`, (err, columns) => {
      if (err) {
        console.error('Error checking tournaments table schema:', err);
        return;
      }

      if (!columns.some(col => col.name === 'stacked_ring_display')) {
        db.run(`ALTER TABLE tournaments ADD COLUMN stacked_ring_display TEXT DEFAULT 'multiple'`, (err) => {
          if (err) {
            console.error('Error adding stacked_ring_display column:', err);
          } else {
            console.log('Successfully added stacked_ring_display column to tournaments table');
          }
        });
      }
    });

    // Migration: Add position column to ring_assignments table if it doesn't exist
    db.all(`PRAGMA table_info(ring_assignments)`, (err, columns) => {
      if (err) {
        console.error('Error checking ring_assignments table schema:', err);
        return;
      }
      
      const hasPositionColumn = columns.some(col => col.name === 'position');
      
      if (!hasPositionColumn) {
        db.run(`ALTER TABLE ring_assignments ADD COLUMN position TEXT NOT NULL DEFAULT 'Center'`, (err) => {
          if (err) {
            console.error('Error adding position column:', err);
          } else {
            console.log('Successfully added position column to ring_assignments table');
          }
        });
      }
    });

    // Migration: Add gender column to judges table if it doesn't exist
    db.all(`PRAGMA table_info(judges)`, (err, columns) => {
      if (err) {
        console.error('Error checking judges table schema:', err);
        return;
      }
      
      const hasGenderColumn = columns.some(col => col.name === 'gender');
      
      if (!hasGenderColumn) {
        db.run(`ALTER TABLE judges ADD COLUMN gender TEXT DEFAULT 'Male'`, (err) => {
          if (err) {
            console.error('Error adding gender column:', err);
          } else {
            console.log('Successfully added gender column to judges table');
          }
        });
      }
    });

    // Migration: Add division detail columns to ring_sessions so each packet records what ran
    const sessionDetailColumns = [
      ['event', 'TEXT'],
      ['gender', 'TEXT'],
      ['age_brackets', 'TEXT'],
      ['rank', 'TEXT'],
      ['color_belts', 'TEXT'],
      ['black_belts', 'TEXT'],
      ['division', 'TEXT'],
      ['division_type', 'TEXT'],
      ['competitor_count', 'INTEGER'],
      ['special_abilities', 'TEXT'],
      // The server's own start/end times; start_time/end_time come from the tablet's clock, which may be off.
      // Judge assignment history is matched against these so both sides use the same clock.
      ['server_start_time', 'TEXT'],
      ['server_end_time', 'TEXT']
    ];
    db.all(`PRAGMA table_info(ring_sessions)`, (err, columns) => {
      if (err) {
        console.error('Error checking ring_sessions table schema:', err);
        return;
      }

      sessionDetailColumns
        .filter(([name]) => !columns.some(col => col.name === name))
        .forEach(([name, type]) => {
          db.run(`ALTER TABLE ring_sessions ADD COLUMN ${name} ${type}`, (err) => {
            if (err) {
              console.error(`Error adding ${name} column to ring_sessions:`, err);
            } else {
              console.log(`Successfully added ${name} column to ring_sessions table`);
            }
          });
        });
    });

    // Judges are returned to the pool when a tournament is closed out; clear any left in tournaments ended before that,
    // then enforce one ring per judge (keeping each judge's newest assignment if older data has more than one)
    db.run(`DELETE FROM ring_assignments WHERE tournament_id IN (SELECT id FROM tournaments WHERE status = 'ended')`, function(err) {
      if (err) {
        console.error('Error clearing ring assignments for ended tournaments:', err);
      } else if (this.changes > 0) {
        console.log(`Returned ${this.changes} judges from ended tournaments to the pool`);
      }
    });
    db.run(`DELETE FROM ring_assignments WHERE id NOT IN (SELECT MAX(id) FROM ring_assignments GROUP BY judge_id)`, function(err) {
      if (err) {
        console.error('Error removing duplicate judge ring assignments:', err);
      } else if (this.changes > 0) {
        console.log(`Removed ${this.changes} duplicate judge ring assignments`);
      }
    });
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_ring_assignments_judge ON ring_assignments(judge_id)', (err) => {
      if (err) console.error('Error creating one-ring-per-judge index:', err);
    });

    // Judge assignment history: ring_assignments holds only current seats (rows are deleted when a ring completes,
    // a judge moves, competes or checks out, or the tournament ends), so triggers keep a permanent record of who sat
    // where and when. Times use the same ISO format as packet start/end times.
    db.run(`CREATE TABLE IF NOT EXISTS judge_assignment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      ring_id INTEGER NOT NULL,
      judge_id INTEGER NOT NULL,
      position TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      unassigned_at TEXT,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (ring_id) REFERENCES rings(id) ON DELETE CASCADE,
      FOREIGN KEY (judge_id) REFERENCES judges(id) ON DELETE CASCADE
    )`);
    db.run(`CREATE TRIGGER IF NOT EXISTS trg_ring_assignment_history_open
      AFTER INSERT ON ring_assignments
      BEGIN
        INSERT INTO judge_assignment_history (tournament_id, ring_id, judge_id, position, assigned_at)
        VALUES (NEW.tournament_id, NEW.ring_id, NEW.judge_id, NEW.position, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
      END`);
    db.run(`CREATE TRIGGER IF NOT EXISTS trg_ring_assignment_history_close
      AFTER DELETE ON ring_assignments
      BEGIN
        UPDATE judge_assignment_history SET unassigned_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE ring_id = OLD.ring_id AND judge_id = OLD.judge_id AND position = OLD.position AND unassigned_at IS NULL;
      END`);
    // Judges already seated when history was added get an open record from their original assignment time
    db.run(`INSERT INTO judge_assignment_history (tournament_id, ring_id, judge_id, position, assigned_at)
      SELECT ra.tournament_id, ra.ring_id, ra.judge_id, ra.position, replace(ra.assigned_at, ' ', 'T') || '.000Z'
      FROM ring_assignments ra
      JOIN rings r ON r.id = ra.ring_id
      JOIN judges j ON j.id = ra.judge_id
      JOIN tournaments t ON t.id = ra.tournament_id
      WHERE NOT EXISTS (
        SELECT 1 FROM judge_assignment_history h
        WHERE h.ring_id = ra.ring_id AND h.judge_id = ra.judge_id AND h.position = ra.position AND h.unassigned_at IS NULL
      )`, function(err) {
      if (err) {
        console.error('Error recording current judge assignments in history:', err);
      } else if (this.changes > 0) {
        console.log(`Recorded ${this.changes} current judge assignments in history`);
      }
    });

    // Indexes for the common lookups by parent (tables with UNIQUE constraints are already indexed)
    [
      'CREATE INDEX IF NOT EXISTS idx_rings_tournament ON rings(tournament_id)',
      'CREATE INDEX IF NOT EXISTS idx_stacked_rings_ring ON stacked_rings(ring_id, stack_order)',
      'CREATE INDEX IF NOT EXISTS idx_ring_sessions_ring ON ring_sessions(ring_id)',
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_tournament ON chat_messages(tournament_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignment_history_tournament ON judge_assignment_history(tournament_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignment_history_ring ON judge_assignment_history(ring_id, judge_id)'
    ].forEach(sql => {
      db.run(sql, (err) => {
        if (err) console.error('Error creating index:', err);
      });
    });

    // Cleanup: remove rows left behind by deletes made before foreign keys were enforced.
    // Orphaned rings go first so their children cascade with them.
    const orphanCleanups = [
      ['rings', 'tournament_id NOT IN (SELECT id FROM tournaments)'],
      ['ring_sessions', 'ring_id NOT IN (SELECT id FROM rings)'],
      ['stacked_rings', 'ring_id NOT IN (SELECT id FROM rings)'],
      ['chat_messages', 'tournament_id NOT IN (SELECT id FROM tournaments)'],
      ['tournament_judges', 'tournament_id NOT IN (SELECT id FROM tournaments) OR judge_id NOT IN (SELECT id FROM judges)'],
      ['ring_assignments', 'ring_id NOT IN (SELECT id FROM rings) OR judge_id NOT IN (SELECT id FROM judges) OR tournament_id NOT IN (SELECT id FROM tournaments)']
    ];
    orphanCleanups.forEach(([table, condition]) => {
      db.run(`DELETE FROM ${table} WHERE ${condition}`, function(err) {
        if (err) {
          console.error(`Error removing orphaned ${table} rows:`, err);
        } else if (this.changes > 0) {
          console.log(`Removed ${this.changes} orphaned ${table} rows`);
        }
      });
    });
  });
}

module.exports = db;
