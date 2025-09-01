const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Configuration
const BASE_URL = 'http://localhost:5003';
const PORT = process.env.PORT || 5006;

// Middleware to verify JWT token and role
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (!['admin', 'agent'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Unauthorized: Only admins and agents can generate PDFs' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token decode error:', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Unified PDF generation endpoint
app.get('/generate-pdf', authenticate, async (req, res) => {
  const { formType, id } = req.query;

  if (!formType || !['vaccination', 'consent'].includes(formType)) {
    return res.status(400).json({ message: 'Invalid or missing form type (vaccination or consent)' });
  }
  if (!id) {
    return res.status(400).json({ message: 'ID is required' });
  }

  const endpoint = formType === 'vaccination'
    ? `/vaccination-exposures/${id}/pdf`
    : `/consent-forms/${id}/pdf`;

  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: req.headers.authorization },
      responseType: 'arraybuffer' // Ensure binary data is handled correctly
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${formType === 'vaccination' ? 'VaccinationRecord' : 'ConsentForm'}_${id}.pdf"`);
    res.status(200).send(response.data);
  } catch (err) {
    console.error('PDF generation error:', err);
    if (err.response) {
      res.status(err.response.status).json({ message: err.response.data.message || 'Error generating PDF' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`PDF Generation Service running on port ${PORT}`);
});