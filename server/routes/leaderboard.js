const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = db.getLeaderboard(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = db.getMatchHistory(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/match/:id', (req, res) => {
  try {
    const data = db.getMatchDetails(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
