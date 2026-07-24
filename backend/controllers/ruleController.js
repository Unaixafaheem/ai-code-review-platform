const Rule = require('../models/Rule');
const Team = require('../models/Team');

function isTeamAdmin(team, userId) {
  if (String(team.owner) === String(userId)) return true;
  return team.members.some((m) => String(m.user) === String(userId) && m.role === 'admin');
}

const listRules = async (req, res) => {
  try {
    const filter = { $or: [{ user: req.user.id }] };
    if (req.userDoc?.activeTeam) {
      filter.$or.push({ team: req.userDoc.activeTeam });
    }
    const rules = await Rule.find(filter).sort({ createdAt: -1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createRule = async (req, res) => {
  try {
    const { title, description, enabled = true, language = 'any', teamId } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      enabled: !!enabled,
      language: language || 'any',
    };

    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team || !isTeamAdmin(team, req.user.id)) {
        return res.status(403).json({ message: 'Team admin required to add team rules' });
      }
      payload.team = teamId;
    } else {
      payload.user = req.user.id;
    }

    const rule = await Rule.create(payload);
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    if (rule.user && String(rule.user) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    if (rule.team) {
      const team = await Team.findById(rule.team);
      if (!team || !isTeamAdmin(team, req.user.id)) {
        return res.status(403).json({ message: 'Team admin required' });
      }
    }

    const { title, description, enabled, language } = req.body;
    if (title !== undefined) rule.title = title.trim();
    if (description !== undefined) rule.description = description.trim();
    if (enabled !== undefined) rule.enabled = !!enabled;
    if (language !== undefined) rule.language = language;
    await rule.save();
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    if (rule.user && String(rule.user) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    if (rule.team) {
      const team = await Team.findById(rule.team);
      if (!team || !isTeamAdmin(team, req.user.id)) {
        return res.status(403).json({ message: 'Team admin required' });
      }
    }

    await rule.deleteOne();
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listRules, createRule, updateRule, deleteRule };
