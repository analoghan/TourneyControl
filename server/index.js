const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const db = require('./database');
const { checkPassword, createToken, requireAuth, verifyWebSocketClient } = require('./auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, verifyClient: verifyWebSocketClient });

app.use(cors());
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { role, password } = req.body;

  if (!role || !password) {
    return res.status(400).json({ error: 'Role and password are required' });
  }

  if (checkPassword(role, password)) {
    res.json({
      success: true,
      token: createToken(role),
      role
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Every API route below this line requires a valid session; most also require the staff role (see auth.js)
app.use('/api', requireAuth);

app.get('/api/auth/session', (req, res) => {
  res.json({ role: req.auth.role, expires: req.auth.exp });
});

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// Tell open screens a ring's stacks were added or removed, with the ring's current stacks
function broadcastStackedRings(ringId) {
  db.all('SELECT * FROM stacked_rings WHERE ring_id = ? ORDER BY stack_order', [ringId], (err, rows) => {
    if (err) return console.error('Error loading stacked rings for broadcast:', err);
    broadcast({ type: 'stacked_rings_changed', data: { ring_id: Number(ringId), stacked_rings: rows } });
  });
}

// Send judges back to the pool: drop the matching ring assignments and tell open screens to refresh
function clearRingAssignments(where, params, data) {
  db.run(`DELETE FROM ring_assignments WHERE ${where}`, params, function(err) {
    if (err) return console.error('Error clearing ring assignments:', err);
    if (this.changes > 0) {
      broadcast({ type: 'ring_assignment_update', data });
    }
  });
}

// API Routes
app.get('/api/tournaments', (req, res) => {
  db.all('SELECT * FROM tournaments ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/tournaments/active', (req, res) => {
  db.all('SELECT * FROM tournaments WHERE status = ? ORDER BY created_at DESC', ['active'], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/tournaments/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Tournament not found' });
    res.json(row);
  });
});

// How the staff dashboard shows stacked rings: 'multiple' = one card per stack, 'single' = one card per ring
const STACKED_RING_DISPLAYS = ['multiple', 'single'];

app.post('/api/tournaments', (req, res) => {
  const { name, num_rings, timezone, stacked_ring_display } = req.body;
  const tz = timezone || 'America/New_York';
  const stackedDisplay = STACKED_RING_DISPLAYS.includes(stacked_ring_display) ? stacked_ring_display : 'multiple';
  db.run('INSERT INTO tournaments (name, num_rings, timezone, stacked_ring_display) VALUES (?, ?, ?, ?)', [name, num_rings, tz, stackedDisplay], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const tournamentId = this.lastID;
    
    // Create rings for the tournament with is_open = 1 and age_bracket = '8 and Under' by default
    const stmt = db.prepare('INSERT INTO rings (tournament_id, ring_number, current_event, is_open, age_bracket, age_brackets, gender, rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (let i = 1; i <= num_rings; i++) {
      stmt.run(tournamentId, i, 'Forms', 1, '8 and Under', '["8 and Under"]', 'Male', 'Color Belts');
    }
    stmt.finalize();
    
    res.json({ id: tournamentId, name, num_rings });
  });
});

app.put('/api/tournaments/:id/status', (req, res) => {
  const { status } = req.body;
  const tournamentId = req.params.id;
  
  // Validate status value
  const validStatuses = ['not_started', 'active', 'ended'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  // Get current tournament status to validate transition
  db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    
    // Validate status transition
    const currentStatus = tournament.status;
    const validTransitions = {
      'not_started': ['active'],
      'active': ['ended'],
      'ended': ['active'] // Allow restarting ended tournaments
    };
    
    if (!validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }
    
    // If ending the tournament, first end all in-progress rings
    if (status === 'ended') {
      const currentTime = new Date().toISOString();
      
      // Get all rings for this tournament that are in progress (have start_time but no end_time)
      db.all(
        'SELECT id FROM rings WHERE tournament_id = ? AND start_time IS NOT NULL AND end_time IS NULL',
        [tournamentId],
        (err, inProgressRings) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // End all in-progress rings
          if (inProgressRings.length > 0) {
            const ringIds = inProgressRings.map(r => r.id);
            
            // Update rings to set end_time
            db.run(
              `UPDATE rings SET end_time = ? WHERE id IN (${ringIds.join(',')})`,
              [currentTime],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                
                // Update ring sessions to set end_time for incomplete sessions
                db.run(
                  `UPDATE ring_sessions SET end_time = ? WHERE ring_id IN (${ringIds.join(',')}) AND end_time IS NULL`,
                  [currentTime],
                  (err) => {
                    if (err) {
                      console.error('Error updating ring sessions:', err);
                    }
                    
                    // Now update the tournament status
                    updateTournamentStatusAndNotify();
                  }
                );
              }
            );
          } else {
            // No rings in progress, just update tournament status
            updateTournamentStatusAndNotify();
          }
        }
      );
    } else if (status === 'active' && currentStatus === 'ended') {
      // If restarting an ended tournament, clear all ring timing to reset them
      db.run(
        'UPDATE rings SET start_time = NULL, end_time = NULL WHERE tournament_id = ?',
        [tournamentId],
        (err) => {
          if (err) {
            console.error('Error clearing ring timing on restart:', err);
          }
          
          // Update tournament status and broadcast
          updateTournamentStatusAndNotify();
          
          // Broadcast ring updates
          db.all('SELECT * FROM rings WHERE tournament_id = ?', [tournamentId], (err, rings) => {
            if (!err && rings) {
              rings.forEach(ring => {
                broadcast({ type: 'ring_update', data: ring });
              });
            }
          });
        }
      );
    } else {
      // For other status changes, just update the tournament
      updateTournamentStatusAndNotify();
    }
    
    function updateTournamentStatusAndNotify() {
      // Update tournament status
      db.run('UPDATE tournaments SET status = ? WHERE id = ?', [status, tournamentId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Get updated tournament
        db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, updatedTournament) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Broadcast tournament status change
          broadcast({ 
            type: 'tournament_status_change', 
            data: updatedTournament 
          });
          
          // If we ended rings, also broadcast ring updates
          if (status === 'ended') {
            // Closing out the tournament returns all of its judges to the pool
            clearRingAssignments('tournament_id = ?', [tournamentId], { tournament_id: Number(tournamentId) });

            db.all('SELECT * FROM rings WHERE tournament_id = ?', [tournamentId], (err, rings) => {
              if (!err && rings) {
                rings.forEach(ring => {
                  broadcast({ type: 'ring_update', data: ring });
                });
              }
            });
          }
          
          res.json(updatedTournament);
        });
      });
    }
  });
});

app.put('/api/tournaments/:id/timezone', (req, res) => {
  const { timezone } = req.body;
  const tournamentId = req.params.id;
  
  const validTimezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];
  if (!validTimezones.includes(timezone)) {
    return res.status(400).json({ error: 'Invalid timezone' });
  }
  
  db.run('UPDATE tournaments SET timezone = ? WHERE id = ?', [timezone, tournamentId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, updatedTournament) => {
      if (err) return res.status(500).json({ error: err.message });
      
      broadcast({ 
        type: 'tournament_timezone_updated', 
        data: updatedTournament 
      });
      
      res.json(updatedTournament);
    });
  });
});

app.put('/api/tournaments/:id/stacked-ring-display', (req, res) => {
  const { stacked_ring_display } = req.body;
  const tournamentId = req.params.id;

  if (!STACKED_RING_DISPLAYS.includes(stacked_ring_display)) {
    return res.status(400).json({ error: 'Invalid stacked ring display' });
  }

  db.run('UPDATE tournaments SET stacked_ring_display = ? WHERE id = ?', [stacked_ring_display, tournamentId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Tournament not found' });

    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, updatedTournament) => {
      if (err) return res.status(500).json({ error: err.message });

      broadcast({
        type: 'tournament_settings_updated',
        data: updatedTournament
      });

      res.json(updatedTournament);
    });
  });
});

app.put('/api/tournaments/:id/name', (req, res) => {
  const { name } = req.body;
  const tournamentId = req.params.id;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tournament name is required' });
  }
  
  db.run('UPDATE tournaments SET name = ? WHERE id = ?', [name.trim(), tournamentId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, updatedTournament) => {
      if (err) return res.status(500).json({ error: err.message });
      
      broadcast({ 
        type: 'tournament_name_updated', 
        data: updatedTournament 
      });
      
      res.json(updatedTournament);
    });
  });
});

app.put('/api/tournaments/:id/rings', (req, res) => {
  const { num_rings } = req.body;
  const tournamentId = req.params.id;
  
  if (!num_rings || num_rings < 1 || num_rings > 70) {
    return res.status(400).json({ error: 'Invalid number of rings (must be 1-70)' });
  }
  
  // Get current tournament
  db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    
    const currentRings = tournament.num_rings;
    
    // Update tournament ring count
    db.run('UPDATE tournaments SET num_rings = ? WHERE id = ?', [num_rings, tournamentId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (num_rings > currentRings) {
        // Add new rings with is_open = 1 and age_bracket = '8 and Under' by default
        const stmt = db.prepare('INSERT INTO rings (tournament_id, ring_number, current_event, is_open, age_bracket, age_brackets, gender, rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (let i = currentRings + 1; i <= num_rings; i++) {
          stmt.run(tournamentId, i, 'Forms', 1, '8 and Under', '["8 and Under"]', 'Male', 'Color Belts');
        }
        stmt.finalize(() => {
          // Get updated tournament
          db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, updatedTournament) => {
            if (err) return res.status(500).json({ error: err.message });
            
            broadcast({ 
              type: 'tournament_rings_updated', 
              data: updatedTournament 
            });
            
            res.json(updatedTournament);
          });
        });
      } else if (num_rings < currentRings) {
        // Remove excess rings
        db.run('DELETE FROM rings WHERE tournament_id = ? AND ring_number > ?', [tournamentId, num_rings], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Get updated tournament
          db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, updatedTournament) => {
            if (err) return res.status(500).json({ error: err.message });
            
            broadcast({ 
              type: 'tournament_rings_updated', 
              data: updatedTournament 
            });
            
            res.json(updatedTournament);
          });
        });
      } else {
        // No change in ring count
        res.json(tournament);
      }
    });
  });
});

app.delete('/api/tournaments/:id', (req, res) => {
  const tournamentId = req.params.id;
  
  // Check tournament status - only allow deletion of ended tournaments
  db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    
    if (tournament.status !== 'ended') {
      return res.status(403).json({ 
        error: 'Only ended tournaments can be deleted' 
      });
    }
    
    // Delete all rings associated with the tournament
    db.run('DELETE FROM rings WHERE tournament_id = ?', [tournamentId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Delete the tournament
      db.run('DELETE FROM tournaments WHERE id = ?', [tournamentId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({ 
          success: true, 
          message: 'Tournament deleted successfully',
          id: parseInt(tournamentId)
        });
      });
    });
  });
});

// Each ring includes its stacked rings, so the dashboard loads in one request instead of one per ring
app.get('/api/tournaments/:id/rings', (req, res) => {
  db.all('SELECT * FROM rings WHERE tournament_id = ? ORDER BY ring_number', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all(
      `SELECT s.* FROM stacked_rings s
       JOIN rings r ON r.id = s.ring_id
       WHERE r.tournament_id = ?
       ORDER BY s.ring_id, s.stack_order`,
      [req.params.id],
      (err, stackedRows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(ring => {
          ring.stacked_rings = stackedRows.filter(s => s.ring_id === ring.id);
        });
        res.json(rows);
      }
    );
  });
});

// Get single ring by ID
app.get('/api/rings/:id', (req, res) => {
  db.get(
    `SELECT rings.*, tournaments.name as tournament_name 
     FROM rings 
     LEFT JOIN tournaments ON rings.tournament_id = tournaments.id 
     WHERE rings.id = ?`,
    [req.params.id],
    (err, ring) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!ring) return res.status(404).json({ error: 'Ring not found' });
      res.json(ring);
    }
  );
});

// Get all sessions for a ring (for debugging/verification)
app.get('/api/rings/:id/sessions', (req, res) => {
  db.all(
    'SELECT * FROM ring_sessions WHERE ring_id = ? ORDER BY session_number',
    [req.params.id],
    (err, sessions) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(sessions);
    }
  );
});

// Division details copied onto each ring session, so reports show what each packet was
const SESSION_DETAIL_FIELDS = [
  'event', 'gender', 'age_brackets', 'rank', 'color_belts', 'black_belts',
  'division', 'division_type', 'competitor_count', 'special_abilities'
];

// Ring row with any fields from an update request applied on top
const withDefinedFields = (ring, body) => {
  const merged = { ...ring };
  Object.keys(ring).forEach(key => {
    if (body[key] !== undefined) merged[key] = body[key];
  });
  return merged;
};

const sessionDetails = (ring) => ({
  event: ring.current_event,
  gender: ring.gender,
  // Older rings only have the single age_bracket column
  age_brackets: ring.age_brackets || JSON.stringify(ring.age_bracket ? [ring.age_bracket] : []),
  rank: ring.rank,
  color_belts: ring.color_belts,
  black_belts: ring.black_belts,
  division: ring.division,
  division_type: ring.division_type,
  competitor_count: ring.competitor_count,
  special_abilities: [
    ring.special_abilities_physical && 'Physical',
    ring.special_abilities_cognitive && 'Cognitive',
    ring.special_abilities_autistic && 'Autistic'
  ].filter(Boolean).join(', ')
});

app.put('/api/rings/:id', (req, res) => {
  const { current_event, gender, age_bracket, age_brackets, rank, division, division_type, color_belts, black_belts, stacked_ring, is_open, judges_needed, rttl_needed, special_abilities_physical, special_abilities_cognitive, special_abilities_autistic, start_time, end_time, competitor_count } = req.body;
  
  // First, get the ring to find its tournament_id
  db.get('SELECT * FROM rings WHERE id = ?', [req.params.id], (err, ring) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!ring) return res.status(404).json({ error: 'Ring not found' });
    
    // Check tournament status
    db.get('SELECT status FROM tournaments WHERE id = ?', [ring.tournament_id], (err, tournament) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
      
      // Prevent updates if tournament has ended
      if (tournament.status === 'ended') {
        return res.status(403).json({ 
          error: 'Tournament has ended. Ring events cannot be modified.' 
        });
      }
      
      // Build dynamic update query based on provided fields
      const updates = [];
      const values = [];
      
      if (current_event !== undefined) {
        updates.push('current_event = ?');
        values.push(current_event);
      }
      if (gender !== undefined) {
        updates.push('gender = ?');
        values.push(gender);
      }
      if (age_bracket !== undefined) {
        updates.push('age_bracket = ?');
        values.push(age_bracket);
      }
      if (age_brackets !== undefined) {
        updates.push('age_brackets = ?');
        values.push(age_brackets);
      }
      if (rank !== undefined) {
        updates.push('rank = ?');
        values.push(rank);
      }
      if (division !== undefined) {
        updates.push('division = ?');
        values.push(division);
      }
      if (division_type !== undefined) {
        updates.push('division_type = ?');
        values.push(division_type);
      }
      if (color_belts !== undefined) {
        updates.push('color_belts = ?');
        values.push(color_belts);
      }
      if (black_belts !== undefined) {
        updates.push('black_belts = ?');
        values.push(black_belts);
      }
      if (stacked_ring !== undefined) {
        updates.push('stacked_ring = ?');
        values.push(stacked_ring ? 1 : 0);
      }
      if (is_open !== undefined) {
        updates.push('is_open = ?');
        values.push(is_open ? 1 : 0);
      }
      if (judges_needed !== undefined) {
        updates.push('judges_needed = ?');
        values.push(judges_needed ? 1 : 0);
      }
      if (rttl_needed !== undefined) {
        updates.push('rttl_needed = ?');
        values.push(rttl_needed ? 1 : 0);
      }
      if (special_abilities_physical !== undefined) {
        updates.push('special_abilities_physical = ?');
        values.push(special_abilities_physical ? 1 : 0);
      }
      if (special_abilities_cognitive !== undefined) {
        updates.push('special_abilities_cognitive = ?');
        values.push(special_abilities_cognitive ? 1 : 0);
      }
      if (special_abilities_autistic !== undefined) {
        updates.push('special_abilities_autistic = ?');
        values.push(special_abilities_autistic ? 1 : 0);
      }
      if (competitor_count !== undefined) {
        updates.push('competitor_count = ?');
        values.push(competitor_count);
      }
      if (start_time !== undefined) {
        updates.push('start_time = ?');
        values.push(start_time);
        
        // If starting a new session (start_time is being set and ring doesn't currently have one)
        if (start_time && !ring.start_time) {
          // Record the division as configured at start, including any settings sent with this request
          const detail = sessionDetails(withDefinedFields(ring, req.body));
          db.get('SELECT COUNT(*) as count FROM ring_sessions WHERE ring_id = ?', [req.params.id], (err, result) => {
            if (!err) {
              const sessionNumber = (result.count || 0) + 1;
              db.run(
                `INSERT INTO ring_sessions (ring_id, session_number, start_time, ${SESSION_DETAIL_FIELDS.join(', ')})
                 VALUES (?, ?, ?, ${SESSION_DETAIL_FIELDS.map(() => '?').join(', ')})`,
                [req.params.id, sessionNumber, start_time, ...SESSION_DETAIL_FIELDS.map(f => detail[f])],
                (err) => {
                  if (err) {
                    console.error('Error creating ring session:', err);
                  }
                }
              );
            }
          });
        }
      }
      if (end_time !== undefined) {
        updates.push('end_time = ?');
        values.push(end_time);
        
        // If ending a session (end_time is being set and ring currently has a start_time)
        if (end_time && ring.start_time) {
          // End Ring resets the ring's settings in this same request, so the stored row (before this update)
          // is the final configuration of the division that just ran, e.g. a corrected competitor count
          const detail = sessionDetails(ring);
          db.run(
            // SQLite (as bundled with node-sqlite3) doesn't support ORDER BY/LIMIT on UPDATE, so pick the row in a subquery
            `UPDATE ring_sessions SET end_time = ?, ${SESSION_DETAIL_FIELDS.map(f => `${f} = ?`).join(', ')} WHERE id = (
              SELECT id FROM ring_sessions WHERE ring_id = ? AND end_time IS NULL ORDER BY session_number DESC LIMIT 1
            )`,
            [end_time, ...SESSION_DETAIL_FIELDS.map(f => detail[f]), req.params.id],
            (err) => {
              if (err) {
                console.error('Error updating ring session:', err);
              }
            }
          );
        }
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      values.push(req.params.id);
      const query = `UPDATE rings SET ${updates.join(', ')} WHERE id = ?`;
      
      // Update ring
      db.run(query, values, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // If current_event was updated, also update all stacked rings for this ring
        if (current_event !== undefined) {
          db.run(
            'UPDATE stacked_rings SET current_event = ? WHERE ring_id = ?',
            [current_event, req.params.id],
            (err) => {
              if (err) {
                console.error('Error updating stacked rings current_event:', err);
              }
            }
          );
        }
        
        // Completing a ring returns its judges to the pool, like the event settings reset
        if (end_time && ring.start_time) {
          clearRingAssignments('ring_id = ?', [ring.id], { ring_id: ring.id, tournament_id: ring.tournament_id });
        }

        db.get('SELECT * FROM rings WHERE id = ?', [req.params.id], (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          broadcast({ type: 'ring_update', data: row });
          res.json(row);
        });
      });
    });
  });
});

// Serve React app for all other routes in production
// Judge Management Endpoints

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove any potential SQL injection characters and trim whitespace
  return input.trim().replace(/[<>]/g, '');
};

const sanitizeAtaNumber = (input) => {
  if (typeof input !== 'string') return '';
  // Only allow numbers and dashes
  return input.replace(/[^0-9-]/g, '');
};

// Get all judges
app.get('/api/judges', (req, res) => {
  db.all('SELECT * FROM judges ORDER BY last_name, first_name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add a new judge
app.post('/api/judges', (req, res) => {
  let { first_name, last_name, ata_number, rank, age, judging_level, competing, competing_creative_xma, competing_teams, teams_coach } = req.body;
  
  // Sanitize inputs
  first_name = sanitizeInput(first_name);
  last_name = sanitizeInput(last_name);
  ata_number = sanitizeAtaNumber(ata_number);
  rank = sanitizeInput(rank) || '';
  judging_level = sanitizeInput(judging_level) || '';
  
  // Only first name, last name, ATA number, and age are required
  if (!first_name || !last_name || !ata_number || !age) {
    return res.status(400).json({ error: 'First name, last name, ATA number, and age are required' });
  }
  
  // Validate age is a number
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
    return res.status(400).json({ error: 'Age must be a valid number between 1 and 120' });
  }
  
  // Check for duplicate ATA number
  db.get('SELECT id FROM judges WHERE ata_number = ?', [ata_number], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row) {
      return res.status(400).json({ error: 'A judge with this ATA number already exists in the database' });
    }
    
    // Insert the new judge
    db.run(
      `INSERT INTO judges (first_name, last_name, ata_number, rank, age, judging_level, competing, competing_creative_xma, competing_teams, teams_coach) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, ata_number, rank, ageNum, judging_level, competing ? 1 : 0, competing_creative_xma ? 1 : 0, competing_teams ? 1 : 0, teams_coach ? 1 : 0],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Judge added successfully' });
      }
    );
  });
});

// Update a judge
app.put('/api/judges/:id', (req, res) => {
  const { id } = req.params;
  let { first_name, last_name, ata_number, rank, age, judging_level, competing, competing_creative_xma, competing_teams, teams_coach } = req.body;
  
  // Sanitize inputs
  first_name = sanitizeInput(first_name);
  last_name = sanitizeInput(last_name);
  ata_number = sanitizeAtaNumber(ata_number);
  rank = sanitizeInput(rank) || '';
  judging_level = sanitizeInput(judging_level) || '';
  
  // Only first name, last name, ATA number, and age are required
  if (!first_name || !last_name || !ata_number || !age) {
    return res.status(400).json({ error: 'First name, last name, ATA number, and age are required' });
  }
  
  // Validate age is a number
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
    return res.status(400).json({ error: 'Age must be a valid number between 1 and 120' });
  }
  
  // Check for duplicate ATA number (excluding current judge)
  db.get('SELECT id FROM judges WHERE ata_number = ? AND id != ?', [ata_number, id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row) {
      return res.status(400).json({ error: 'A judge with this ATA number already exists in the database' });
    }
    
    // Update the judge
    db.run(
      `UPDATE judges SET first_name = ?, last_name = ?, ata_number = ?, rank = ?, age = ?, judging_level = ?, competing = ?, competing_creative_xma = ?, competing_teams = ?, teams_coach = ? WHERE id = ?`,
      [first_name, last_name, ata_number, rank, ageNum, judging_level, competing ? 1 : 0, competing_creative_xma ? 1 : 0, competing_teams ? 1 : 0, teams_coach ? 1 : 0, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Judge updated successfully' });
      }
    );
  });
});

// Delete a judge
app.delete('/api/judges/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM judges WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Judge deleted successfully' });
  });
});

// Tournament Judge Assignment Endpoints

// Get all judges checked in to a tournament, with their ring assignment (which may be in another tournament,
// since a judge can be in only one ring anywhere)
app.get('/api/tournaments/:tournamentId/judges', (req, res) => {
  const { tournamentId } = req.params;
  
  db.all(
    `SELECT tj.*, j.first_name, j.last_name, j.ata_number, j.rank, j.age, j.gender, j.judging_level,
            j.competing, j.competing_creative_xma, j.competing_teams, j.teams_coach,
            ra.ring_id, ra.position, r.ring_number,
            ra.tournament_id AS assigned_tournament_id, t.name AS assigned_tournament_name
     FROM tournament_judges tj
     JOIN judges j ON tj.judge_id = j.id
     LEFT JOIN ring_assignments ra ON ra.judge_id = j.id
     LEFT JOIN rings r ON ra.ring_id = r.id
     LEFT JOIN tournaments t ON ra.tournament_id = t.id
     WHERE tj.tournament_id = ? AND tj.checked_in = 1
     ORDER BY j.last_name, j.first_name`,
    [tournamentId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Check a judge in to a tournament, which makes them available for ring assignments there
app.post('/api/tournaments/:tournamentId/judges', (req, res) => {
  const tournamentId = Number(req.params.tournamentId);
  const { judge_id, notes } = req.body;
  
  if (!judge_id) {
    return res.status(400).json({ error: 'Judge ID is required' });
  }
  
  db.get('SELECT status FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    if (tournament.status === 'ended') {
      return res.status(403).json({ error: 'Tournament has ended. Judges cannot be checked in.' });
    }
    
    db.run(
      `INSERT INTO tournament_judges (tournament_id, judge_id, notes, checked_in, check_in_time) VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(tournament_id, judge_id) DO UPDATE SET checked_in = 1, check_in_time = excluded.check_in_time`,
      [tournamentId, judge_id, notes || null, new Date().toISOString()],
      (err) => {
        if (err) {
          if (err.message.includes('FOREIGN KEY constraint')) {
            return res.status(404).json({ error: 'Judge not found' });
          }
          return res.status(500).json({ error: err.message });
        }
        broadcast({ type: 'judge_check_in', data: { tournament_id: tournamentId, judge_id: Number(judge_id) } });
        res.json({ message: 'Judge checked in successfully' });
      }
    );
  });
});

// Update tournament judge (check-in status, currently competing, notes)
app.put('/api/tournaments/:tournamentId/judges/:judgeId', (req, res) => {
  const tournamentId = Number(req.params.tournamentId);
  const judgeId = Number(req.params.judgeId);
  const { checked_in, currently_competing, notes } = req.body;
  
  const updates = [];
  const values = [];
  
  if (checked_in !== undefined) {
    updates.push('checked_in = ?');
    values.push(checked_in ? 1 : 0);
    
    if (checked_in) {
      updates.push('check_in_time = ?');
      values.push(new Date().toISOString());
    }
  }
  
  if (currently_competing !== undefined) {
    updates.push('currently_competing = ?');
    values.push(currently_competing ? 1 : 0);
  }
  
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  values.push(tournamentId, judgeId);
  
  db.run(
    `UPDATE tournament_judges SET ${updates.join(', ')} WHERE tournament_id = ? AND judge_id = ?`,
    values,
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Judge assignment not found' });
      }
      if (currently_competing !== undefined) {
        // A competing judge can't judge, so they leave any ring they're in here
        if (currently_competing) {
          clearRingAssignments('tournament_id = ? AND judge_id = ?', [tournamentId, judgeId], { tournament_id: tournamentId });
        }
        broadcast({ type: 'judge_status_update', data: { tournament_id: tournamentId, judge_id: judgeId } });
      }
      res.json({ message: 'Judge updated successfully' });
    }
  );
});

// Check a judge out of a tournament; they also leave any ring they're assigned to there
app.delete('/api/tournaments/:tournamentId/judges/:judgeId', (req, res) => {
  const tournamentId = Number(req.params.tournamentId);
  const judgeId = Number(req.params.judgeId);
  
  db.run(
    'DELETE FROM tournament_judges WHERE tournament_id = ? AND judge_id = ?',
    [tournamentId, judgeId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      clearRingAssignments('tournament_id = ? AND judge_id = ?', [tournamentId, judgeId], { tournament_id: tournamentId });
      if (this.changes > 0) {
        broadcast({ type: 'judge_check_out', data: { tournament_id: tournamentId, judge_id: judgeId } });
      }
      res.json({ message: 'Judge checked out successfully' });
    }
  );
});

// Ring Assignment Endpoints

// Get all judges assigned to a ring
app.get('/api/rings/:ringId/judges', (req, res) => {
  const { ringId } = req.params;
  
  db.all(
    `SELECT ra.*, j.first_name, j.last_name, j.ata_number, j.rank, j.judging_level
     FROM ring_assignments ra
     JOIN judges j ON ra.judge_id = j.id
     WHERE ra.ring_id = ?
     ORDER BY 
       CASE ra.position
         WHEN 'Center' THEN 1
         WHEN 'Corner A' THEN 2
         WHEN 'Corner B' THEN 3
       END`,
    [ringId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Assign a judge to a ring position, replacing whoever held it. A judge can be in only one ring at a time
// (across all tournaments); picking a judge already in this ring moves them to the new position.
app.post('/api/rings/:ringId/judges', (req, res) => {
  const ringId = Number(req.params.ringId);
  const { judge_id, position } = req.body;
  
  if (!judge_id || !position) {
    return res.status(400).json({ error: 'Judge ID and Position are required' });
  }
  
  const validPositions = ['Center', 'Corner A', 'Corner B'];
  if (!validPositions.includes(position)) {
    return res.status(400).json({ error: 'Position must be Center, Corner A, or Corner B' });
  }
  
  db.get(
    `SELECT r.id, r.tournament_id, t.status
     FROM rings r
     JOIN tournaments t ON t.id = r.tournament_id
     WHERE r.id = ?`,
    [ringId],
    (err, ring) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!ring) return res.status(404).json({ error: 'Ring not found' });
      if (ring.status === 'ended') {
        return res.status(403).json({ error: 'Tournament has ended. Judges cannot be assigned.' });
      }
      
      db.get(
        `SELECT ra.ring_id, ra.position, r.ring_number, t.name AS tournament_name, j.first_name, j.last_name
         FROM ring_assignments ra
         JOIN rings r ON ra.ring_id = r.id
         JOIN tournaments t ON ra.tournament_id = t.id
         JOIN judges j ON ra.judge_id = j.id
         WHERE ra.judge_id = ?`,
        [judge_id],
        (err, existingAssignment) => {
          if (err) return res.status(500).json({ error: err.message });
          
          if (existingAssignment && existingAssignment.ring_id !== ringId) {
            return res.status(400).json({ 
              error: `${existingAssignment.first_name} ${existingAssignment.last_name} is already assigned to Ring ${existingAssignment.ring_number} as ${existingAssignment.position} (${existingAssignment.tournament_name})` 
            });
          }
          
          db.get(
            'SELECT currently_competing FROM tournament_judges WHERE tournament_id = ? AND judge_id = ? AND checked_in = 1',
            [ring.tournament_id, judge_id],
            (err, checkedIn) => {
              if (err) return res.status(500).json({ error: err.message });
              if (!checkedIn) {
                return res.status(400).json({ error: 'This judge is not checked in to this tournament. Check them in on the Judge Tracker first.' });
              }
              if (checkedIn.currently_competing) {
                return res.status(400).json({ error: 'This judge is currently competing. Clear "Currently Competing" on the Judge Tracker first.' });
              }
              
              // Free the position, and the judge's old position if they're moving within this ring
              db.run(
                'DELETE FROM ring_assignments WHERE ring_id = ? AND (position = ? OR judge_id = ?)',
                [ringId, position, judge_id],
                (err) => {
                  if (err) return res.status(500).json({ error: err.message });
                  
                  db.run(
                    'INSERT INTO ring_assignments (ring_id, judge_id, tournament_id, position) VALUES (?, ?, ?, ?)',
                    [ringId, judge_id, ring.tournament_id, position],
                    function(err) {
                      if (err) {
                        if (err.message.includes('UNIQUE constraint')) {
                          return res.status(400).json({ error: 'That judge or position was just assigned by someone else. Please try again.' });
                        }
                        return res.status(500).json({ error: err.message });
                      }
                      broadcast({ type: 'ring_assignment_update', data: { ring_id: ringId, tournament_id: ring.tournament_id } });
                      res.json({ id: this.lastID, message: 'Judge assigned to ring successfully' });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Remove a judge from a ring
app.delete('/api/rings/:ringId/judges/:position', (req, res) => {
  const ringId = Number(req.params.ringId);
  const { position } = req.params;
  
  db.run(
    'DELETE FROM ring_assignments WHERE ring_id = ? AND position = ?',
    [ringId, position],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes > 0) {
        broadcast({ type: 'ring_assignment_update', data: { ring_id: ringId } });
      }
      res.json({ message: 'Judge removed from ring successfully' });
    }
  );
});

// Get all ring assignments for a tournament
app.get('/api/tournaments/:tournamentId/ring-assignments', (req, res) => {
  const { tournamentId } = req.params;
  
  db.all(
    `SELECT ra.*, r.ring_number, j.first_name, j.last_name, j.ata_number
     FROM ring_assignments ra
     JOIN rings r ON ra.ring_id = r.id
     JOIN judges j ON ra.judge_id = j.id
     WHERE ra.tournament_id = ?
     ORDER BY r.ring_number, j.last_name, j.first_name`,
    [tournamentId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Parses a JSON array column (age brackets, belts), tolerating empty or malformed values
const parseList = (json) => {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Tournament Report Endpoint
app.get('/api/tournaments/:id/report', (req, res) => {
  const { id } = req.params;
  
  // Get tournament info
  db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, tournament) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get all rings for this tournament
    db.all(
      `SELECT id, ring_number FROM rings 
       WHERE tournament_id = ? 
       ORDER BY ring_number`,
      [id],
      (err, rings) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Get all sessions for all rings
        const ringIds = rings.map(r => r.id);
        if (ringIds.length === 0) {
          return res.json({
            tournament: {
              id: tournament.id,
              name: tournament.name,
              status: tournament.status,
              timezone: tournament.timezone,
              created_at: tournament.created_at,
              total_rings: 0,
              completed_sessions: 0
            },
            rings: []
          });
        }
        
        db.all(
          `SELECT ring_id, session_number, start_time, end_time, ${SESSION_DETAIL_FIELDS.join(', ')}
           FROM ring_sessions
           WHERE ring_id IN (${ringIds.join(',')})
           ORDER BY ring_id, session_number`,
          [],
          (err, sessions) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            // Group sessions by ring
            const sessionsByRing = {};
            sessions.forEach(session => {
              if (!sessionsByRing[session.ring_id]) {
                sessionsByRing[session.ring_id] = [];
              }
              
              let runTime = null;
              if (session.start_time && session.end_time) {
                const start = new Date(session.start_time);
                const end = new Date(session.end_time);
                runTime = Math.round((end - start) / 1000 / 60); // minutes
              }
              
              sessionsByRing[session.ring_id].push({
                session_number: session.session_number,
                start_time: session.start_time,
                end_time: session.end_time,
                run_time_minutes: runTime,
                // Division details; null for packets recorded before these were tracked
                event: session.event,
                gender: session.gender,
                age_brackets: parseList(session.age_brackets),
                rank: session.rank,
                belts: parseList(session.rank === 'Black Belts' ? session.black_belts : session.color_belts),
                division: session.division,
                division_type: session.division_type,
                competitor_count: session.competitor_count,
                special_abilities: session.special_abilities,
                status: session.start_time && session.end_time ? 'Completed' : 
                        session.start_time ? 'In Progress' : 'Not Started'
              });
            });
            
            // Build ring data with sessions
            const ringsWithData = rings.map(ring => ({
              ring_number: ring.ring_number,
              sessions: sessionsByRing[ring.id] || []
            }));
            
            // Calculate total completed sessions
            const completedSessions = sessions.filter(s => s.start_time && s.end_time).length;
            
            res.json({
              tournament: {
                id: tournament.id,
                name: tournament.name,
                status: tournament.status,
                timezone: tournament.timezone,
                created_at: tournament.created_at,
                total_rings: rings.length,
                completed_sessions: completedSessions
              },
              rings: ringsWithData
            });
          }
        );
      }
    );
  });
});

// Admin endpoint to clean up incomplete sessions
app.post('/api/admin/cleanup-sessions', (req, res) => {
  // Find all sessions with start_time but no end_time
  db.all(
    'SELECT * FROM ring_sessions WHERE start_time IS NOT NULL AND end_time IS NULL',
    [],
    (err, incompleteSessions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (incompleteSessions.length === 0) {
        return res.json({ 
          message: 'No incomplete sessions found',
          cleaned: 0
        });
      }
      
      // For each incomplete session, try to set end_time from the ring's end_time
      let cleaned = 0;
      let promises = incompleteSessions.map(session => {
        return new Promise((resolve) => {
          db.get('SELECT end_time FROM rings WHERE id = ?', [session.ring_id], (err, ring) => {
            if (err || !ring || !ring.end_time) {
              // If no ring end_time, just mark session as ended at start_time + 1 hour (placeholder)
              const endTime = new Date(new Date(session.start_time).getTime() + 60 * 60 * 1000).toISOString();
              db.run(
                'UPDATE ring_sessions SET end_time = ? WHERE id = ?',
                [endTime, session.id],
                (err) => {
                  if (!err) cleaned++;
                  resolve();
                }
              );
            } else {
              // Use ring's end_time
              db.run(
                'UPDATE ring_sessions SET end_time = ? WHERE id = ?',
                [ring.end_time, session.id],
                (err) => {
                  if (!err) cleaned++;
                  resolve();
                }
              );
            }
          });
        });
      });
      
      Promise.all(promises).then(() => {
        res.json({
          message: `Cleaned up ${cleaned} incomplete sessions`,
          cleaned: cleaned,
          total_found: incompleteSessions.length
        });
      });
    }
  );
});

// Stacked Rings API Endpoints

// Get all stacked rings for a ring
app.get('/api/rings/:ringId/stacked', (req, res) => {
  db.all(
    'SELECT * FROM stacked_rings WHERE ring_id = ? ORDER BY stack_order',
    [req.params.ringId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Create a new stacked ring
app.post('/api/rings/:ringId/stacked', (req, res) => {
  const { ringId } = req.params;
  const {
    current_event = 'Forms',
    gender = 'Male',
    age_bracket = '8 and Under',
    age_brackets = '["8 and Under"]',
    rank = 'Color Belts',
    division = 'Bantam',
    division_type = 'Champion',
    color_belts = '[]',
    black_belts = '[]',
    special_abilities_physical = 0,
    special_abilities_cognitive = 0,
    special_abilities_autistic = 0,
    competitor_count = 1
  } = req.body;

  // Get the current max stack_order for this ring
  db.get(
    'SELECT MAX(stack_order) as max_order FROM stacked_rings WHERE ring_id = ?',
    [ringId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const stackOrder = (result.max_order || 0) + 1;
      
      db.run(
        `INSERT INTO stacked_rings (
          ring_id, stack_order, current_event, gender, age_bracket, age_brackets,
          rank, division, division_type, color_belts, black_belts,
          special_abilities_physical, special_abilities_cognitive, special_abilities_autistic,
          competitor_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ringId, stackOrder, current_event, gender, age_bracket, age_brackets,
          rank, division, division_type, color_belts, black_belts,
          special_abilities_physical ? 1 : 0,
          special_abilities_cognitive ? 1 : 0,
          special_abilities_autistic ? 1 : 0,
          competitor_count
        ],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          db.get('SELECT * FROM stacked_rings WHERE id = ?', [this.lastID], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Broadcast update
            db.get('SELECT * FROM rings WHERE id = ?', [ringId], (err, ring) => {
              if (!err && ring) {
                broadcast({ type: 'ring_update', data: ring });
              }
            });
            broadcastStackedRings(ringId);
            
            res.json(row);
          });
        }
      );
    }
  );
});

// Update a stacked ring
app.put('/api/stacked-rings/:id', (req, res) => {
  const {
    current_event, gender, age_bracket, age_brackets, rank, division,
    division_type, color_belts, black_belts, special_abilities_physical,
    special_abilities_cognitive, special_abilities_autistic, competitor_count
  } = req.body;

  const updates = [];
  const values = [];

  if (current_event !== undefined) {
    updates.push('current_event = ?');
    values.push(current_event);
  }
  if (gender !== undefined) {
    updates.push('gender = ?');
    values.push(gender);
  }
  if (age_bracket !== undefined) {
    updates.push('age_bracket = ?');
    values.push(age_bracket);
  }
  if (age_brackets !== undefined) {
    updates.push('age_brackets = ?');
    values.push(age_brackets);
  }
  if (rank !== undefined) {
    updates.push('rank = ?');
    values.push(rank);
  }
  if (division !== undefined) {
    updates.push('division = ?');
    values.push(division);
  }
  if (division_type !== undefined) {
    updates.push('division_type = ?');
    values.push(division_type);
  }
  if (color_belts !== undefined) {
    updates.push('color_belts = ?');
    values.push(color_belts);
  }
  if (black_belts !== undefined) {
    updates.push('black_belts = ?');
    values.push(black_belts);
  }
  if (special_abilities_physical !== undefined) {
    updates.push('special_abilities_physical = ?');
    values.push(special_abilities_physical ? 1 : 0);
  }
  if (special_abilities_cognitive !== undefined) {
    updates.push('special_abilities_cognitive = ?');
    values.push(special_abilities_cognitive ? 1 : 0);
  }
  if (special_abilities_autistic !== undefined) {
    updates.push('special_abilities_autistic = ?');
    values.push(special_abilities_autistic ? 1 : 0);
  }
  if (competitor_count !== undefined) {
    updates.push('competitor_count = ?');
    values.push(competitor_count);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(req.params.id);
  const query = `UPDATE stacked_rings SET ${updates.join(', ')} WHERE id = ?`;

  db.run(query, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT * FROM stacked_rings WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Broadcast stacked ring update
      if (row) {
        broadcast({ type: 'stacked_ring_update', data: row });
        
        // Also broadcast parent ring update to refresh the main ring display
        db.get('SELECT * FROM rings WHERE id = ?', [row.ring_id], (err, ring) => {
          if (!err && ring) {
            broadcast({ type: 'ring_update', data: ring });
          }
        });
      }
      
      res.json(row);
    });
  });
});

// Delete a stacked ring
app.delete('/api/stacked-rings/:id', (req, res) => {
  // First get the ring_id before deleting
  db.get('SELECT ring_id FROM stacked_rings WHERE id = ?', [req.params.id], (err, stackedRing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!stackedRing) return res.status(404).json({ error: 'Stacked ring not found' });
    
    db.run('DELETE FROM stacked_rings WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Reorder remaining stacked rings
      db.all(
        'SELECT id FROM stacked_rings WHERE ring_id = ? ORDER BY stack_order',
        [stackedRing.ring_id],
        (err, rows) => {
          if (!err && rows) {
            rows.forEach((row, index) => {
              db.run(
                'UPDATE stacked_rings SET stack_order = ? WHERE id = ?',
                [index + 1, row.id]
              );
            });
          }
          
          // Broadcast update
          db.get('SELECT * FROM rings WHERE id = ?', [stackedRing.ring_id], (err, ring) => {
            if (!err && ring) {
              broadcast({ type: 'ring_update', data: ring });
            }
          });
          // Queued after the renumbering above, so the list reflects the new stack order
          broadcastStackedRings(stackedRing.ring_id);
          
          res.json({ message: 'Stacked ring deleted successfully' });
        }
      );
    });
  });
});

// Chat endpoints

// Get all chat messages for a tournament
app.get('/api/tournaments/:tournamentId/chat', (req, res) => {
  db.all(
    'SELECT * FROM chat_messages WHERE tournament_id = ? ORDER BY created_at ASC',
    [req.params.tournamentId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Post a new chat message
app.post('/api/tournaments/:tournamentId/chat', (req, res) => {
  const { message, sender_name } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  
  db.run(
    'INSERT INTO chat_messages (tournament_id, message, sender_name) VALUES (?, ?, ?)',
    [req.params.tournamentId, message.trim(), sender_name || 'Staff'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM chat_messages WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Broadcast new message to all connected clients
        broadcast({ type: 'chat_message', data: row });
        
        res.json(row);
      });
    }
  );
});

// Serve React app for all other routes in production (MUST BE LAST!)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
