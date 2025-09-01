const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const WebSocket = require('ws');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS for preflight
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204, // Handle preflight success with 204 No Content
  preflightContinue: false // Do not pass preflight to next handler
}));

app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Status: ${res.statusCode}`);
  });
  next();
});

// Increase payload limit for JSON requests (e.g., for base64 images)
app.use(express.json({ limit: '10mb' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large. Maximum size is 10MB.' });
  }
  res.status(500).json({ message: 'Internal server error' });
});

// WebSocket setup on a different port
const wss = new WebSocket.Server({ port: 5002 });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected on port 5002');
  ws.on('message', async (message) => {
    try {
      const { type } = JSON.parse(message);
      if (type === 'subscribe_queue') {
        const result = await pool.query(`
          SELECT o.id, s.name as service_name, o.code, o.order_number, o.created_at, o.status
          FROM orders o
          JOIN services s ON o.service_id = s.id
          WHERE o.status NOT IN ('redirected', 'ended')
          ORDER BY o.created_at
        `);
        ws.send(JSON.stringify({ type: 'queue_update', data: result.rows }));
      } else if (type === 'subscribe_rabies_exposures') {
        const result = await pool.query('SELECT * FROM rabies_exposures ORDER BY created_at DESC');
        ws.send(JSON.stringify({ type: 'rabies_exposures_update', data: result.rows }));
      }
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  });
  ws.on('close', () => console.log('WebSocket client disconnected from port 5002'));
});

const notifyQueueUpdate = async () => {
  try {
    const result = await pool.query(`
      SELECT o.id, s.name as service_name, o.code, o.order_number, o.created_at, o.status
      FROM orders o
      JOIN services s ON o.service_id = s.id
      WHERE o.status NOT IN ('redirected', 'ended')
      ORDER BY o.created_at
    `);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'queue_update', data: result.rows }));
      }
    });
  } catch (err) {
    console.error('Error broadcasting queue update:', err);
  }
};

const notifyRabiesExposuresUpdate = async () => {
  try {
    const result = await pool.query('SELECT * FROM rabies_exposures ORDER BY created_at DESC');
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'rabies_exposures_update', data: result.rows }));
      }
    });
  } catch (err) {
    console.error('Error broadcasting rabies exposures update:', err);
  }
};

// Middleware for auth
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get current day and time in WAT (UTC+1)
const getCurrentDayAndTime = () => {
  const now = new Date();
  const watOffset = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
  const watDate = new Date(now.getTime() + watOffset);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = days[watDate.getUTCDay()];
  const currentTime = watDate.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  return { currentDay, currentTime };
};

// Login route
app.post('/api/login', async (req, res) => {
  console.log('Handling /api/login request');
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'User not found' });
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update user password
app.put('/api/users/:id/password', authenticate, async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  try {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update user profile picture
app.post('/api/users/:id/profile-picture', authenticate, async (req, res) => {
  const { id } = req.params;
  const { profilePicture } = req.body;
  if (!profilePicture) {
    return res.status(400).json({ message: 'Profile picture data is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING id, email, role, profile_picture',
      [profilePicture, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = result.rows[0];
    res.json({
      message: 'Profile picture updated',
      data: {
        ...user,
        username: user.email.split('@')[0]
      }
    });
  } catch (err) {
    console.error('Profile picture update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Users CRUD
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? 'SELECT id, email, role, profile_picture FROM users WHERE role = $1' : 'SELECT id, email, role, profile_picture FROM users';
    const result = await pool.query(query, role ? [role] : []);
    const users = result.rows.map(user => ({
      ...user,
      username: user.email.split('@')[0]
    }));
    res.json(users);
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/users/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, email, role, profile_picture FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = result.rows[0];
    res.json({
      ...user,
      username: user.email.split('@')[0]
    });
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users', authenticate, async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, role, profile_picture) VALUES ($1, $2, $3, NULL) RETURNING id, email, role, profile_picture',
      [email, hashedPassword, role || 'agent']
    );
    const user = result.rows[0];
    res.json({
      ...user,
      username: user.email.split('@')[0]
    });
  } catch (err) {
    console.error('User create error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/users/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { email, password, role } = req.body;
  try {
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    const result = await pool.query(
      'UPDATE users SET email = $1, password = COALESCE($2, password), role = $3 WHERE id = $4 RETURNING id, email, role, profile_picture',
      [email, hashedPassword, role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = result.rows[0];
    res.json({
      ...user,
      username: user.email.split('@')[0]
    });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM agent_assignments WHERE agent_id = $1', [id]);
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Services CRUD
app.get('/api/services', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services');
    res.json(result.rows);
  } catch (err) {
    console.error('Services fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/services', authenticate, async (req, res) => {
  const { name, code, description, status, type } = req.body;
  const finalCode = code || name.charAt(0).toUpperCase();
  try {
    const result = await pool.query(
      'INSERT INTO services (name, code, description, status, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, finalCode, description, status, type || 'normal']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Service create error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/services/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, code, description, status, type } = req.body;
  const finalCode = code || name.charAt(0).toUpperCase();
  try {
    const result = await pool.query(
      'UPDATE services SET name = $1, code = $2, description = $3, status = $4, type = $5 WHERE id = $6 RETURNING *',
      [name, finalCode, description, status, type, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Service not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Service update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/services/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM orders WHERE service_id = $1', [id]);
    await pool.query('DELETE FROM station_service_assignments WHERE service_id = $1 OR station_id = $1', [id]);
    await pool.query('DELETE FROM agent_assignments WHERE station_id = $1', [id]);
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    console.error('Service delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get visible services (public)
app.get('/api/visible-services', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM services WHERE status = TRUE AND type = 'normal'");
    res.json(result.rows);
  } catch (err) {
    console.error('Visible services fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get caisses
app.get('/api/caisses', authenticate, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM services WHERE type = 'caisse'");
    res.json(result.rows);
  } catch (err) {
    console.error('Caisses fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get boxes
app.get('/api/boxes', authenticate, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM services WHERE type = 'box'");
    res.json(result.rows);
  } catch (err) {
    console.error('Boxes fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get non-visible services (for redirection to boxes)
app.get('/api/non-visible-services', authenticate, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM services WHERE type = 'box'");
    res.json(result.rows);
  } catch (err) {
    console.error('Non-visible services fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Client order submission with daily reset
app.post('/api/client/order', async (req, res) => {
  const { serviceId, orderNumber } = req.body;
  try {
    if (!/^[a-zA-Z0-9]{6,12}$/.test(orderNumber)) {
      return res.status(400).json({ message: 'Order number must be 6-12 alphanumeric characters' });
    }
    const serviceResult = await pool.query('SELECT code FROM services WHERE id = $1', [serviceId]);
    if (serviceResult.rows.length === 0) return res.status(404).json({ message: 'Service not found' });
    const serviceCode = serviceResult.rows[0].code;
    // Count orders for the current day only
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM orders WHERE service_id = $1 AND DATE(created_at) = CURRENT_DATE',
      [serviceId]
    );
    const nextNumber = parseInt(countResult.rows[0].count) + 1;
    const generatedCode = `${serviceCode}-${nextNumber}`;
    const result = await pool.query(
      'INSERT INTO orders (service_id, order_number, code, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING code',
      [serviceId, orderNumber, generatedCode]
    );
    res.json({ code: result.rows[0].code, message: 'Order submitted successfully' });
    notifyQueueUpdate();
  } catch (err) {
    console.error('Order error:', err.stack);
    res.status(500).json({ message: err.message });
  }
});

// Assignments CRUD
app.get('/api/assignments', authenticate, async (req, res) => {
  try {
    const agentAssignments = await pool.query('SELECT * FROM agent_assignments');
    const stationServiceAssignments = await pool.query('SELECT * FROM station_service_assignments');
    res.json({ agentAssignments: agentAssignments.rows, stationServiceAssignments: stationServiceAssignments.rows });
  } catch (err) {
    console.error('Assignments fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/assignments', authenticate, async (req, res) => {
  const { type, agentId, stationId, serviceId, startDay, endDay, startTime, endTime } = req.body;
  try {
    if (type === 'agent_station') {
      if (!agentId || !stationId || !startDay || !endDay || !startTime || !endTime) {
        return res.status(400).json({ message: 'All fields are required for agent assignment' });
      }
      const overlapCheck = await pool.query(
        `SELECT * FROM agent_assignments 
         WHERE agent_id = $1 
         AND (
           ($2 <= end_day AND $3 >= start_day)
           AND ($4::time < end_time AND $5::time > start_time)
         )`,
        [agentId, startDay, endDay, startTime, endTime]
      );
      if (overlapCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Agent already assigned to another station in this time slot' });
      }
      const result = await pool.query(
        'INSERT INTO agent_assignments (agent_id, station_id, start_day, end_day, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [agentId, stationId, startDay, endDay, startTime, endTime]
      );
      res.json(result.rows[0]);
    } else if (type === 'caisse_service') {
      if (!stationId || !serviceId) {
        return res.status(400).json({ message: 'Station and service are required for caisse-service assignment' });
      }
      const result = await pool.query(
        'INSERT INTO station_service_assignments (station_id, service_id) VALUES ($1, $2) RETURNING *',
        [stationId, serviceId]
      );
      res.json(result.rows[0]);
    } else {
      return res.status(400).json({ message: 'Invalid assignment type' });
    }
  } catch (err) {
    console.error('Assignment create error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/assignments/:type/:id', authenticate, async (req, res) => {
  const { type, id } = req.params;
  const { agentId, stationId, serviceId, startDay, endDay, startTime, endTime } = req.body;
  try {
    if (type === 'agent_station') {
      if (!agentId || !stationId || !startDay || !endDay || !startTime || !endTime) {
        return res.status(400).json({ message: 'All fields are required for agent assignment' });
      }
      const overlapCheck = await pool.query(
        `SELECT * FROM agent_assignments 
         WHERE agent_id = $1 
         AND id != $2
         AND (
           ($3 <= end_day AND $4 >= start_day)
           AND ($5::time < end_time AND $6::time > start_time)
         )`,
        [agentId, id, startDay, endDay, startTime, endTime]
      );
      if (overlapCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Agent already assigned to another station in this time slot' });
      }
      const result = await pool.query(
        'UPDATE agent_assignments SET agent_id = $1, station_id = $2, start_day = $3, end_day = $4, start_time = $5, end_time = $6 WHERE id = $7 RETURNING *',
        [agentId, stationId, startDay, endDay, startTime, endTime, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Assignment not found' });
      res.json(result.rows[0]);
    } else if (type === 'caisse_service') {
      if (!stationId || !serviceId) {
        return res.status(400).json({ message: 'Station and service are required for caisse-service assignment' });
      }
      const result = await pool.query(
        'UPDATE station_service_assignments SET station_id = $1, service_id = $2 WHERE id = $3 RETURNING *',
        [stationId, serviceId, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Assignment not found' });
      res.json(result.rows[0]);
    } else {
      return res.status(400).json({ message: 'Invalid assignment type' });
    }
  } catch (err) {
    console.error('Assignment update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/assignments/:type/:id', authenticate, async (req, res) => {
  const { type, id } = req.params;
  try {
    if (type === 'agent_station') {
      await pool.query('DELETE FROM agent_assignments WHERE id = $1', [id]);
    } else if (type === 'caisse_service') {
      await pool.query('DELETE FROM station_service_assignments WHERE id = $1', [id]);
    } else {
      return res.status(400).json({ message: 'Invalid assignment type' });
    }
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error('Assignment delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Queue API (admin queue)
app.get('/api/queues', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, s.name as service_name, o.code, o.order_number, o.created_at, o.called_at, o.waiting_time, o.reception_start_at, o.reception_time, o.status
      FROM orders o
      JOIN services s ON o.service_id = s.id
      WHERE o.status NOT IN ('redirected', 'ended')
      ORDER BY o.created_at
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Queues fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Agent-specific queue (include absent orders for all queues)
app.get('/api/agent-queue', authenticate, async (req, res) => {
  const { id } = req.user;
  const { currentDay, currentTime } = getCurrentDayAndTime();
  try {
    const assignment = await pool.query(
      `SELECT station_id FROM agent_assignments 
       WHERE agent_id = $1 
       AND ($2 BETWEEN start_day AND end_day OR start_day = $2)
       AND ($3::time BETWEEN start_time AND end_time)`,
      [id, currentDay, currentTime]
    );
    if (assignment.rows.length === 0) return res.status(404).json({ message: 'No assignment for current time' });
    const stationId = assignment.rows[0].station_id;
    const station = await pool.query('SELECT type, name FROM services WHERE id = $1', [stationId]);
    if (station.rows.length === 0) return res.status(404).json({ message: 'Station not found' });
    const stationType = station.rows[0].type;

    let query = '';
    let params = [];
    if (stationType === 'caisse') {
      const services = await pool.query('SELECT service_id FROM station_service_assignments WHERE station_id = $1', [stationId]);
      if (services.rows.length > 0) {
        const serviceIds = services.rows.map(s => s.service_id);
        query = `SELECT o.id, s.name as service_name, o.code, o.order_number, o.created_at, o.status
                 FROM orders o
                 JOIN services s ON o.service_id = s.id
                 WHERE o.service_id IN (${serviceIds.join(',')}) AND o.status IN ('pending', 'absent')
                 ORDER BY o.created_at`;
      } else {
        query = `SELECT o.id, s.name as service_name, o.code, o.order_number, o.created_at, o.status
                 FROM orders o
                 JOIN services s ON o.service_id = s.id
                 WHERE o.status IN ('pending', 'absent') AND s.type = 'normal'
                 ORDER BY o.created_at`;
      }
    } else if (stationType === 'box') {
      query = `SELECT o.id, s.name as service_name, o.code, o.order_number, o.created_at, o.status
               FROM orders o
               JOIN services s ON o.service_id = s.id
               WHERE o.service_id = $1 AND o.status IN ('redirected', 'absent')
               ORDER BY o.created_at`;
      params = [stationId];
    } else {
      return res.status(400).json({ message: 'Invalid station type' });
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Agent queue fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get global messages with station and service
app.get('/api/messages', authenticate, async (req, res) => {
  const { id, role } = req.user;
  try {
    let stationName = '';
    if (role === 'agent') {
      const { currentDay, currentTime } = getCurrentDayAndTime();
      const assignment = await pool.query(
        `SELECT station_id FROM agent_assignments 
         WHERE agent_id = $1 
         AND ($2 BETWEEN start_day AND end_day OR start_day = $2)
         AND ($3::time BETWEEN start_time AND end_time)`,
        [id, currentDay, currentTime]
      );
      if (assignment.rows.length > 0) {
        const stationId = assignment.rows[0].station_id;
        const station = await pool.query('SELECT name FROM services WHERE id = $1', [stationId]);
        if (station.rows.length > 0) {
          stationName = station.rows[0].name;
        }
      }
    }
    const result = await pool.query('SELECT english_message, french_message FROM settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({
        english_message: '{code} is waiting at {station} for {service}',
        french_message: '{code} attend à {station} pour {service}',
        stationName
      });
    }
    res.json({ ...result.rows[0], stationName });
  } catch (err) {
    console.error('Messages fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update global messages
app.put('/api/messages', authenticate, async (req, res) => {
  const { englishMessage, frenchMessage } = req.body;
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO settings (id, english_message, french_message) VALUES ($1, $2, $3)',
        [1, englishMessage, frenchMessage]
      );
    } else {
      await pool.query(
        'UPDATE settings SET english_message = $1, french_message = $2 WHERE id = 1',
        [englishMessage, frenchMessage]
      );
    }
    res.json({ message: 'Messages updated' });
  } catch (err) {
    console.error('Messages update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Call code with TTS formatting
app.post('/api/orders/:id/call', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const order = await pool.query('SELECT service_id, code FROM orders WHERE id = $1', [id]);
    if (order.rows.length === 0) return res.status(404).json({ message: 'Order not found' });
    const { service_id, code } = order.rows[0];
    const service = await pool.query('SELECT name FROM services WHERE id = $1', [service_id]);
    if (service.rows.length === 0) return res.status(404).json({ message: 'Service not found' });
    const serviceName = service.rows[0].name;

    const { id: agentId } = req.user;
    const { currentDay, currentTime } = getCurrentDayAndTime();
    const assignment = await pool.query(
      `SELECT station_id FROM agent_assignments 
       WHERE agent_id = $1 
       AND ($2 BETWEEN start_day AND end_day OR start_day = $2)
       AND ($3::time BETWEEN start_time AND end_time)`,
      [agentId, currentDay, currentTime]
    );
    if (assignment.rows.length === 0) return res.status(404).json({ message: 'No assignment for current time' });
    const stationId = assignment.rows[0].station_id;
    const station = await pool.query('SELECT name FROM services WHERE id = $1', [stationId]);
    if (station.rows.length === 0) return res.status(404).json({ message: 'Station not found' });
    const stationName = station.rows[0].name;

    const [codeLetter, codeNumber] = code.split('-');
    const ttsMessage = `${codeLetter} ${codeNumber} is waiting at ${stationName} for ${serviceName}`;

    await pool.query('UPDATE orders SET called_at = CURRENT_TIMESTAMP, status = \'called\' WHERE id = $1', [id]);
    res.json({ message: 'Call launched', serviceName, ttsMessage });
    notifyQueueUpdate();
  } catch (err) {
    console.error('Order call error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Stop waiting
app.post('/api/orders/:id/stop-waiting', authenticate, async (req, res) => {
  const { id } = req.params;
  const { waitingTime } = req.body;
  try {
    await pool.query('UPDATE orders SET waiting_time = $1, reception_start_at = CURRENT_TIMESTAMP, status = \'reception\' WHERE id = $2', [waitingTime, id]);
    res.json({ message: 'Waiting stopped' });
    notifyQueueUpdate();
  } catch (err) {
    console.error('Stop waiting error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Stop reception
app.post('/api/orders/:id/stop-reception', authenticate, async (req, res) => {
  const { id } = req.params;
  const { receptionTime } = req.body;
  try {
    await pool.query('UPDATE orders SET reception_time = $1, status = \'completed\' WHERE id = $2', [receptionTime, id]);
    res.json({ message: 'Reception stopped' });
    notifyQueueUpdate();
  } catch (err) {
    console.error('Stop reception error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Absent
app.post('/api/orders/:id/absent', authenticate, async (req, res) => {
  const { id } = req.params;
  const { waitingTime } = req.body;
  try {
    await pool.query('UPDATE orders SET waiting_time = $1, status = \'absent\' WHERE id = $2', [waitingTime, id]);
    res.json({ message: 'Marked absent' });
    notifyQueueUpdate();
  } catch (err) {
    console.error('Mark absent error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Restore absent order
app.post('/api/orders/:id/restore', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const order = await pool.query('SELECT service_id, status FROM orders WHERE id = $1 AND status = \'absent\'', [id]);
    if (order.rows.length === 0) return res.status(404).json({ message: 'Order not found or not absent' });
    const { service_id } = order.rows[0];
    const service = await pool.query('SELECT type FROM services WHERE id = $1', [service_id]);
    if (service.rows.length === 0) return res.status(404).json({ message: 'Service not found' });
    const serviceType = service.rows[0].type;
    const originalStatus = serviceType === 'box' ? 'redirected' : 'pending';
    await pool.query('UPDATE orders SET status = $1, called_at = NULL, waiting_time = NULL WHERE id = $2', [originalStatus, id]);
    res.json({ message: `Order restored to ${originalStatus}` });
    notifyQueueUpdate();
  } catch (err) {
    console.error('Restore order error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Redirect
app.put('/api/orders/:id/redirect', authenticate, async (req, res) => {
  const { id } = req.params;
  const { newServiceId } = req.body;
  try {
    await pool.query('UPDATE orders SET service_id = $1, status = \'redirected\' WHERE id = $2', [newServiceId, id]);
    res.json({ message: 'Redirected' });
    notifyQueueUpdate();
  } catch (err) {
    console.error('Redirect order error:', err);
    res.status(500).json({ message: err.message });
  }
});

// End journey
app.post('/api/orders/:id/end', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE orders SET status = \'ended\' WHERE id = $1', [id]);
    res.json({ message: 'Journey ended' });
    notifyQueueUpdate();
  } catch (err) {
    console.error('End journey error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Next code for agent
app.get('/api/next-code', authenticate, async (req, res) => {
  const { id } = req.user;
  const { currentDay, currentTime } = getCurrentDayAndTime();
  try {
    const assignment = await pool.query(
      `SELECT station_id FROM agent_assignments 
       WHERE agent_id = $1 
       AND ($2 BETWEEN start_day AND end_day OR start_day = $2)
       AND ($3::time BETWEEN start_time AND end_time)`,
      [id, currentDay, currentTime]
    );
    if (assignment.rows.length === 0) return res.status(404).json({ message: 'No assignment for current time' });
    const stationId = assignment.rows[0].station_id;
    const station = await pool.query('SELECT type, name FROM services WHERE id = $1', [stationId]);
    if (station.rows.length === 0) return res.status(404).json({ message: 'Station not found' });
    const stationType = station.rows[0].type;

    let query = '';
    let params = [];
    if (stationType === 'caisse') {
      const services = await pool.query('SELECT service_id FROM station_service_assignments WHERE station_id = $1', [stationId]);
      if (services.rows.length > 0) {
        const serviceIds = services.rows.map(s => s.service_id);
        query = `SELECT o.*, s.name as service_name, s.code as service_code
                 FROM orders o
                 JOIN services s ON o.service_id = s.id
                 WHERE o.service_id IN (${serviceIds.join(',')}) AND o.status = 'pending'
                 ORDER BY o.created_at LIMIT 1`;
      } else {
        query = `SELECT o.*, s.name as service_name, s.code as service_code
                 FROM orders o
                 JOIN services s ON o.service_id = s.id
                 WHERE o.status = 'pending' AND s.type = 'normal'
                 ORDER BY o.created_at LIMIT 1`;
      }
    } else if (stationType === 'box') {
      query = `SELECT o.*, s.name as service_name, s.code as service_code
               FROM orders o
               JOIN services s ON o.service_id = s.id
               WHERE o.service_id = $1 AND o.status = 'redirected'
               ORDER BY o.created_at LIMIT 1`;
      params = [stationId];
    } else {
      return res.status(400).json({ message: 'Invalid station type' });
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'No next code' });
    const nextOrder = result.rows[0];
    const [codeLetter, codeNumber] = nextOrder.code.split('-');
    const ttsMessage = `${codeLetter} ${codeNumber} is waiting at ${station.rows[0].name} for ${nextOrder.service_name}`;
    await pool.query('UPDATE orders SET called_at = CURRENT_TIMESTAMP, status = \'called\' WHERE id = $1', [nextOrder.id]);
    res.json({ ...nextOrder, ttsMessage });
    notifyQueueUpdate();
  } catch (err) {
    console.error('Next code fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));