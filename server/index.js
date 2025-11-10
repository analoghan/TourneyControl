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
  const { name, num_rings } = req.body;
  db.run('INSERT INTO tournaments (name, num_rings) VALUES (?, ?)', [name, num_rings], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const tournamentId = this.lastID;
    
    // Create rings for the tournament
    const stmt = db.prepare('INSERT INTO rings (tournament_id, ring_number, current_event) VALUES (?, ?, ?)');
    for (let i = 1; i <= num_rings; i++) {
      stmt.run(tournamentId, i, 'Forms');
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
        
        res.json(updatedTournament);
      });
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

app.put('/api/rings/:id', (req, res) => {
  const { current_event, gender, age_bracket, age_brackets, rank, division, color_belts, black_belts, stacked_ring, special_abilities_physical, special_abilities_cognitive, special_abilities_autistic } = req.body;
  
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
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
