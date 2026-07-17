const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Scoreboard = require('../models/Scoreboard');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

const ADMIN_ROLES = ['SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'];

// 1. ADMIN: List all tournaments
router.get('/tournaments', authenticateToken, authorizeRoles(...ADMIN_ROLES), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const tournaments = await Tournament.find({ tenantId }).sort({ created_at: -1 });
        res.json(tournaments);
    } catch (err) {
        console.error('Error listing tournaments:', err);
        res.status(500).json({ error: 'Server error listing tournaments' });
    }
});

// 2. ADMIN: Get single tournament with all details
router.get('/tournaments/:id', authenticateToken, authorizeRoles(...ADMIN_ROLES), async (req, res) => {
    try {
        const tournament = await Tournament.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        res.json(tournament);
    } catch (err) {
        console.error('Error fetching tournament:', err);
        res.status(500).json({ error: 'Server error fetching tournament' });
    }
});

// 3. ADMIN: Create a new tournament
router.post('/tournaments', authenticateToken, authorizeRoles(...ADMIN_ROLES), async (req, res) => {
    const { name, sport, format, teams, groups, knockoutRounds } = req.body;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

    if (!name || !sport || !format) {
        return res.status(400).json({ error: 'Name, sport, and format are required.' });
    }
    if (!teams || teams.length < 2) {
        return res.status(400).json({ error: 'At least 2 teams are required.' });
    }

    try {
        const newTournament = new Tournament({
            tenantId,
            branchId,
            name,
            sport,
            format, // 'group', 'knockout', 'group+knockout'
            status: 'DRAFT',
            teams: teams.map(t => ({
                name: t.name,
                shortName: t.shortName || t.name.substring(0, 3).toUpperCase(),
                color: t.color || '#38BDF8'
            })),
            groups: groups || [],
            fixtures: [],
            pointsTable: teams.map(t => ({
                teamName: t.name,
                played: 0,
                won: 0,
                lost: 0,
                drawn: 0,
                points: 0,
                nrr: 0
            })),
            knockoutRounds: knockoutRounds || [],
            winner: null
        });

        await newTournament.save();
        res.status(201).json(newTournament);
    } catch (err) {
        console.error('Error creating tournament:', err);
        res.status(500).json({ error: 'Server error creating tournament' });
    }
});

// 4. ADMIN: Update tournament
router.put('/tournaments/:id', authenticateToken, authorizeRoles(...ADMIN_ROLES), async (req, res) => {
    const tenantId = req.user.tenantId;
    const { name, status, teams, groups, fixtures, pointsTable, knockoutRounds, winner } = req.body;

    try {
        const tournament = await Tournament.findOne({ _id: req.params.id, tenantId });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found or unauthorized' });
        }

        if (name !== undefined) tournament.name = name;
        if (status !== undefined) tournament.status = status;
        if (teams !== undefined) tournament.teams = teams;
        if (groups !== undefined) tournament.groups = groups;
        if (fixtures !== undefined) tournament.fixtures = fixtures;
        if (pointsTable !== undefined) tournament.pointsTable = pointsTable;
        if (knockoutRounds !== undefined) tournament.knockoutRounds = knockoutRounds;
        if (winner !== undefined) tournament.winner = winner;
        tournament.updatedAt = new Date();

        await tournament.save();
        res.json(tournament);
    } catch (err) {
        console.error('Error updating tournament:', err);
        res.status(500).json({ error: 'Server error updating tournament' });
    }
});

// 5. ADMIN: Delete tournament
router.delete('/tournaments/:id', authenticateToken, authorizeRoles(...ADMIN_ROLES), async (req, res) => {
    const tenantId = req.user.tenantId;
    try {
        const result = await Tournament.deleteOne({ _id: req.params.id, tenantId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Tournament not found or unauthorized' });
        }
        res.json({ success: true, message: 'Tournament deleted.' });
    } catch (err) {
        console.error('Error deleting tournament:', err);
        res.status(500).json({ error: 'Server error deleting tournament' });
    }
});

// 6. ADMIN: Auto-generate fixtures from teams
router.post('/tournaments/:id/generate-fixtures', authenticateToken, authorizeRoles(...ADMIN_ROLES), async (req, res) => {
    const tenantId = req.user.tenantId;

    try {
        const tournament = await Tournament.findOne({ _id: req.params.id, tenantId });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        const teams = tournament.teams || [];
        let fixtures = [];
        let matchNumber = 1;

        if (tournament.format === 'group' || tournament.format === 'group+knockout') {
            // Group stage: round-robin within each group
            const groups = tournament.groups || [];
            if (groups.length === 0) {
                // No groups defined — treat all teams as one group
                for (let i = 0; i < teams.length; i++) {
                    for (let j = i + 1; j < teams.length; j++) {
                        fixtures.push({
                            matchNumber: matchNumber++,
                            teamA: teams[i].name,
                            teamB: teams[j].name,
                            scoreboardId: null,
                            stage: 'group',
                            group: 'Group A',
                            status: 'UPCOMING',
                            winner: null
                        });
                    }
                }
            } else {
                // Round-robin within each group
                for (const group of groups) {
                    const groupTeams = group.teamNames || [];
                    for (let i = 0; i < groupTeams.length; i++) {
                        for (let j = i + 1; j < groupTeams.length; j++) {
                            fixtures.push({
                                matchNumber: matchNumber++,
                                teamA: groupTeams[i],
                                teamB: groupTeams[j],
                                scoreboardId: null,
                                stage: 'group',
                                group: group.name,
                                status: 'UPCOMING',
                                winner: null
                            });
                        }
                    }
                }
            }

            if (tournament.format === 'group+knockout') {
                // Add placeholder knockout fixtures
                const numGroups = groups.length || 1;
                if (numGroups >= 2) {
                    // Semi-finals
                    fixtures.push({ matchNumber: matchNumber++, teamA: 'TBD', teamB: 'TBD', scoreboardId: null, stage: 'semi-final', status: 'UPCOMING', winner: null });
                    fixtures.push({ matchNumber: matchNumber++, teamA: 'TBD', teamB: 'TBD', scoreboardId: null, stage: 'semi-final', status: 'UPCOMING', winner: null });
                }
                // Final
                fixtures.push({ matchNumber: matchNumber++, teamA: 'TBD', teamB: 'TBD', scoreboardId: null, stage: 'final', status: 'UPCOMING', winner: null });
            }
        } else if (tournament.format === 'knockout') {
            // Single elimination bracket
            const numTeams = teams.length;
            // Pair teams for first round
            for (let i = 0; i < numTeams; i += 2) {
                if (i + 1 < numTeams) {
                    fixtures.push({
                        matchNumber: matchNumber++,
                        teamA: teams[i].name,
                        teamB: teams[i + 1].name,
                        scoreboardId: null,
                        stage: numTeams <= 4 ? 'semi-final' : 'quarter-final',
                        status: 'UPCOMING',
                        winner: null
                    });
                } else {
                    // Bye — odd number of teams
                    fixtures.push({
                        matchNumber: matchNumber++,
                        teamA: teams[i].name,
                        teamB: 'BYE',
                        scoreboardId: null,
                        stage: 'quarter-final',
                        status: 'UPCOMING',
                        winner: teams[i].name
                    });
                }
            }
            // Placeholder subsequent rounds
            const numFirstRound = Math.ceil(numTeams / 2);
            if (numFirstRound >= 4) {
                // Semi-finals
                fixtures.push({ matchNumber: matchNumber++, teamA: 'TBD', teamB: 'TBD', scoreboardId: null, stage: 'semi-final', status: 'UPCOMING', winner: null });
                fixtures.push({ matchNumber: matchNumber++, teamA: 'TBD', teamB: 'TBD', scoreboardId: null, stage: 'semi-final', status: 'UPCOMING', winner: null });
            }
            if (numFirstRound >= 2) {
                // Final
                fixtures.push({ matchNumber: matchNumber++, teamA: 'TBD', teamB: 'TBD', scoreboardId: null, stage: 'final', status: 'UPCOMING', winner: null });
            }
        }

        tournament.fixtures = fixtures;
        tournament.status = 'ONGOING';
        tournament.updatedAt = new Date();
        await tournament.save();

        res.json(tournament);
    } catch (err) {
        console.error('Error generating fixtures:', err);
        res.status(500).json({ error: 'Server error generating fixtures' });
    }
});

// 7. ADMIN: Create a scoreboard for a specific tournament fixture
router.post('/tournaments/:id/create-match/:fixtureIndex', authenticateToken, authorizeRoles(...ADMIN_ROLES), async (req, res) => {
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;
    const fixtureIndex = parseInt(req.params.fixtureIndex);
    const { matchFormat, totalOvers, matchDuration } = req.body;

    try {
        const tournament = await Tournament.findOne({ _id: req.params.id, tenantId });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        const fixtures = tournament.fixtures || [];
        if (fixtureIndex < 0 || fixtureIndex >= fixtures.length) {
            return res.status(400).json({ error: 'Invalid fixture index' });
        }

        const fixture = fixtures[fixtureIndex];
        if (fixture.scoreboardId) {
            return res.status(400).json({ error: 'Scoreboard already created for this fixture' });
        }
        if (fixture.teamA === 'TBD' || fixture.teamB === 'TBD') {
            return res.status(400).json({ error: 'Teams not yet determined for this fixture' });
        }

        const sport = tournament.sport;
        const teamAObj = (tournament.teams || []).find(t => t.name === fixture.teamA);
        const teamBObj = (tournament.teams || []).find(t => t.name === fixture.teamB);

        // Create the scoreboard
        const newScoreboard = new Scoreboard({
            tenantId,
            branchId,
            sport,
            matchName: `${tournament.name} — Match ${fixture.matchNumber}`,
            teamAName: fixture.teamA,
            teamBName: fixture.teamB,
            teamAScore: 0,
            teamBScore: 0,
            status: 'LIVE',
            matchType: 'tournament',
            matchFormat: matchFormat || null,
            totalOvers: totalOvers || null,
            matchDuration: matchDuration || null,
            tournamentId: tournament._id,
            matchNumber: fixture.matchNumber,
            teamAColor: teamAObj?.color || '#38BDF8',
            teamBColor: teamBObj?.color || '#EF4444',
            currentInnings: 1,
            currentBattingTeam: 'A',
            winner: null,
            events: [],
            settings: {
                cricket: sport === 'cricket' ? {
                    wicketsA: 0, wicketsB: 0,
                    oversA: '0.0', oversB: '0.0',
                    target: null, firstInningsScore: null,
                    currentBatsman1: '', currentBatsman2: '', currentBowler: '',
                    ballsInOver: 0, overSummary: [], overHistory: [],
                    partnership: { runs: 0, balls: 0 }
                } : undefined,
                football: sport === 'football' ? {
                    timerRunning: false, timerStartAt: null, timerSeconds: 0,
                    half: '1st', stoppageTime: 0,
                    yellowCardsA: 0, yellowCardsB: 0,
                    redCardsA: 0, redCardsB: 0, goalScorers: []
                } : undefined,
                badminton: sport === 'badminton' ? {
                    setsWonA: 0, setsWonB: 0, setScores: [],
                    currentSetNumber: 1, serving: 'A', matchPoint: null
                } : undefined
            }
        });

        await newScoreboard.save();

        // Update the fixture with the scoreboard ID
        fixtures[fixtureIndex].scoreboardId = newScoreboard._id;
        fixtures[fixtureIndex].status = 'LIVE';
        tournament.fixtures = fixtures;
        tournament.updatedAt = new Date();
        await tournament.save();

        res.status(201).json({ scoreboard: newScoreboard, tournament });
    } catch (err) {
        console.error('Error creating tournament match:', err);
        res.status(500).json({ error: 'Server error creating tournament match' });
    }
});

module.exports = router;
