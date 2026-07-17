const express = require('express');
const router = express.Router();
const Scoreboard = require('../models/Scoreboard');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// SSE clients registry: scoreboardId -> Array of active response objects
const sseClients = {};

// Helper to broadcast scoreboard updates to all listening SSE clients
function broadcastScoreboardUpdate(scoreboardId, data) {
    const clients = sseClients[scoreboardId];
    if (!clients || !clients.length) return;
    
    const payload = JSON.stringify(data);
    clients.forEach(res => {
        try {
            res.write(`data: ${payload}\n\n`);
        } catch (err) {
            console.error(`Error sending SSE update to client for scoreboard ${scoreboardId}:`, err);
        }
    });
}

// 1. PUBLIC: Get Single Scoreboard (Spectators / TV / OBS)
router.get('/scoreboards/:id', async (req, res) => {
    try {
        const scoreboard = await Scoreboard.findOne({ _id: req.params.id });
        if (!scoreboard) {
            return res.status(404).json({ error: 'Scoreboard not found' });
        }
        res.json(scoreboard);
    } catch (err) {
        console.error('Error fetching scoreboard:', err);
        res.status(500).json({ error: 'Server error fetching scoreboard' });
    }
});

// 2. PUBLIC: Real-time Server-Sent Events (SSE) stream for score updates
router.get('/scoreboards/:id/stream', async (req, res) => {
    const scoreboardId = req.params.id;
    
    // Set headers for SSE stream
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable proxy buffering for Vercel/Nginx
    });
    
    // Send immediate confirmation of stream start
    res.write('retry: 3000\n'); // Ask client to reconnect in 3s if disconnected
    
    try {
        // Send initial scoreboard state immediately upon connection
        const scoreboard = await Scoreboard.findOne({ _id: scoreboardId });
        if (scoreboard) {
            res.write(`data: ${JSON.stringify(scoreboard)}\n\n`);
        }
    } catch (err) {
        console.error('Error sending initial SSE state:', err);
    }

    // Register active client response object
    if (!sseClients[scoreboardId]) {
        sseClients[scoreboardId] = [];
    }
    sseClients[scoreboardId].push(res);
    
    // Keep connection alive with periodic pings (every 25 seconds)
    const pingInterval = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch (err) {
            // Client likely closed but req.on('close') hasn't fired yet
        }
    }, 25000);

    // Clean up when client disconnects
    req.on('close', () => {
        clearInterval(pingInterval);
        if (sseClients[scoreboardId]) {
            sseClients[scoreboardId] = sseClients[scoreboardId].filter(client => client !== res);
            if (sseClients[scoreboardId].length === 0) {
                delete sseClients[scoreboardId];
            }
        }
    });
});

// 3. ADMIN: List all scoreboards
router.get('/scoreboards', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const scoreboards = await Scoreboard.find({ tenantId }).sort({ created_at: -1 });
        res.json(scoreboards);
    } catch (err) {
        console.error('Error listing scoreboards:', err);
        res.status(500).json({ error: 'Server error listing scoreboards' });
    }
});

// 4. ADMIN: Create a new scoreboard
router.post('/scoreboards', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    const { sport, matchName, teamAName, teamBName, bookingId, matchType, matchFormat, totalOvers, matchDuration, tournamentId, matchNumber, teamAColor, teamBColor } = req.body;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;
    
    if (!sport || !matchName || !teamAName || !teamBName) {
        return res.status(400).json({ error: 'Sport, match name, and team names are required.' });
    }
    
    try {
        const newScoreboard = new Scoreboard({
            tenantId,
            branchId,
            bookingId: bookingId || undefined,
            sport,
            matchName,
            teamAName,
            teamBName,
            teamAScore: 0,
            teamBScore: 0,
            status: 'LIVE',
            matchType: matchType || 'standalone',
            matchFormat: matchFormat || null,
            totalOvers: totalOvers ? Number(totalOvers) : null,
            matchDuration: matchDuration ? Number(matchDuration) : null,
            tournamentId: tournamentId || null,
            matchNumber: matchNumber || null,
            teamAColor: teamAColor || '#38BDF8',
            teamBColor: teamBColor || '#EF4444',
            currentInnings: 1,
            currentBattingTeam: 'A',
            winner: null,
            events: [],
            settings: {
                // Pre-populate sport-specific dynamic structures
                cricket: sport === 'cricket' ? {
                    wicketsA: 0,
                    wicketsB: 0,
                    oversA: '0.0',
                    oversB: '0.0',
                    target: null,
                    firstInningsScore: null,
                    currentBatsman1: '',
                    currentBatsman2: '',
                    currentBowler: '',
                    ballsInOver: 0,
                    overSummary: [],
                    overHistory: [],
                    partnership: { runs: 0, balls: 0 }
                } : undefined,
                football: sport === 'football' ? {
                    timerRunning: false,
                    timerStartAt: null,
                    timerSeconds: 0,
                    half: '1st',
                    stoppageTime: 0,
                    yellowCardsA: 0,
                    yellowCardsB: 0,
                    redCardsA: 0,
                    redCardsB: 0,
                    goalScorers: []
                } : undefined,
                badminton: sport === 'badminton' ? {
                    setsWonA: 0,
                    setsWonB: 0,
                    setScores: [],
                    currentSetNumber: 1,
                    serving: 'A',
                    matchPoint: null
                } : undefined
            }
        });
        
        await newScoreboard.save();
        res.status(201).json(newScoreboard);
    } catch (err) {
        console.error('Error creating scoreboard:', err);
        res.status(500).json({ error: 'Server error creating scoreboard' });
    }
});

// 5. ADMIN: Update scoreboard state (score, settings, status) and broadcast update
router.put('/scoreboards/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    const { teamAScore, teamBScore, status, matchName, teamAName, teamBName, settings, events, currentInnings, currentBattingTeam, winner } = req.body;
    const tenantId = req.user.tenantId;
    
    try {
        const scoreboard = await Scoreboard.findOne({ _id: req.params.id, tenantId });
        if (!scoreboard) {
            return res.status(404).json({ error: 'Scoreboard not found or unauthorized' });
        }
        
        // Update fields if provided
        if (teamAScore !== undefined) scoreboard.teamAScore = Number(teamAScore);
        if (teamBScore !== undefined) scoreboard.teamBScore = Number(teamBScore);
        if (status !== undefined) scoreboard.status = status;
        if (matchName !== undefined) scoreboard.matchName = matchName;
        if (teamAName !== undefined) scoreboard.teamAName = teamAName;
        if (teamBName !== undefined) scoreboard.teamBName = teamBName;
        if (settings !== undefined) scoreboard.settings = settings;
        if (events !== undefined) scoreboard.events = events;
        if (currentInnings !== undefined) scoreboard.currentInnings = Number(currentInnings);
        if (currentBattingTeam !== undefined) scoreboard.currentBattingTeam = currentBattingTeam;
        if (winner !== undefined) scoreboard.winner = winner;
        
        scoreboard.updatedAt = new Date();
        
        await scoreboard.save();
        
        // Broadcast the update immediately in real-time
        broadcastScoreboardUpdate(scoreboard._id.toString(), scoreboard);
        
        res.json(scoreboard);
    } catch (err) {
        console.error('Error updating scoreboard:', err);
        res.status(500).json({ error: 'Server error updating scoreboard' });
    }
});

// 6. ADMIN: Delete a scoreboard
router.delete('/scoreboards/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    const tenantId = req.user.tenantId;
    try {
        const result = await Scoreboard.deleteOne({ _id: req.params.id, tenantId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Scoreboard not found or unauthorized' });
        }
        
        // Broadcast connection termination/deletion event to existing stream viewers
        broadcastScoreboardUpdate(req.params.id, { type: 'deleted', id: req.params.id });
        
        res.json({ success: true, message: 'Scoreboard deleted.' });
    } catch (err) {
        console.error('Error deleting scoreboard:', err);
        res.status(500).json({ error: 'Server error deleting scoreboard' });
    }
});

module.exports = router;
