const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Authentication credentials (in production, use environment variables)
const JUDGES_PASSWORD = process.env.JUDGES_PASSWORD || 'ata';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'compete2win';

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { role, password } = req.body;
  
  if (!role || !password) {
    return res.status(400).json({ error: 'Role and password are required' });
  }
  
  let isValid = false;
  if (role === 'judge' && password === JUDGES_PASSWORD) {
    isValid = true;
  } else if (role === 'staff' && password === STAFF_PASSWORD) {
    isValid = true;
  }
  
  if (isValid) {
    // Generate a simple session token (timestamp-based)
    const token = Buffer.from(`${role}:${Date.now()}`).toString('base64');
    res.json({ 
      success: true, 
      token,
      role 
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
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

app.post('/api/tournaments', (req, res) => {
  const { name, num_rings, timezone } = req.body;
  const tz = timezone || 'America/New_York';
  db.run('INSERT INTO tournaments (name, num_rings, timezone) VALUES (?, ?, ?)', [name, num_rings, tz], function(err) {
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

app.get('/api/tournaments/:id/rings', (req, res) => {
  db.all('SELECT * FROM rings WHERE tournament_id = ? ORDER BY ring_number', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
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
          db.get('SELECT COUNT(*) as count FROM ring_sessions WHERE ring_id = ?', [req.params.id], (err, result) => {
            if (!err) {
              const sessionNumber = (result.count || 0) + 1;
              db.run(
                'INSERT INTO ring_sessions (ring_id, session_number, start_time) VALUES (?, ?, ?)',
                [req.params.id, sessionNumber, start_time],
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
          db.run(
            'UPDATE ring_sessions SET end_time = ? WHERE ring_id = ? AND end_time IS NULL ORDER BY session_number DESC LIMIT 1',
            [end_time, req.params.id],
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
          `SELECT ring_id, session_number, start_time, end_time 
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

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
