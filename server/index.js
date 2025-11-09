const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

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
      'ended': []
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
  const { current_event, gender, age_bracket, rank, division } = req.body;
  
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
      if (rank !== undefined) {
        updates.push('rank = ?');
        values.push(rank);
      }
      if (division !== undefined) {
        updates.push('division = ?');
        values.push(division);
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
