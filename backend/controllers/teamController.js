const crypto = require('crypto');
const Team = require('../models/Team');
const User = require('../models/User');

function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || `team-${crypto.randomBytes(3).toString('hex')}`
  );
}

function isMember(team, userId) {
  const id = String(userId);
  return team.members.some((m) => String(m.user) === id) || String(team.owner) === id;
}

function isAdmin(team, userId) {
  const id = String(userId);
  if (String(team.owner) === id) return true;
  return team.members.some((m) => String(m.user) === id && m.role === 'admin');
}

const createTeam = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Team name is required' });

    let slug = slugify(name.trim());
    const exists = await Team.findOne({ slug });
    if (exists) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;

    const team = await Team.create({
      name: name.trim(),
      slug,
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'admin' }],
    });

    await User.findByIdAndUpdate(req.user.id, { activeTeam: team._id });

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listTeams = async (req, res) => {
  try {
    const teams = await Team.find({ 'members.user': req.user.id })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
    if (!team || !isMember(team, req.user.id)) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const joinTeam = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode?.trim()) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const team = await Team.findOne({ inviteCode: inviteCode.trim().toLowerCase() });
    if (!team) return res.status(404).json({ message: 'Invalid invite code' });

    if (!isMember(team, req.user.id)) {
      team.members.push({ user: req.user.id, role: 'member' });
      await team.save();
    }

    await User.findByIdAndUpdate(req.user.id, { activeTeam: team._id });

    const populated = await Team.findById(team._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setActiveTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team || !isMember(team, req.user.id)) {
      return res.status(404).json({ message: 'Team not found' });
    }
    await User.findByIdAndUpdate(req.user.id, { activeTeam: team._id });
    res.json({ activeTeam: team._id, name: team.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearActiveTeam = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { activeTeam: null });
    res.json({ activeTeam: null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const regenerateInvite = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team || !isAdmin(team, req.user.id)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    team.inviteCode = crypto.randomBytes(6).toString('hex');
    await team.save();
    res.json({ inviteCode: team.inviteCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or member' });
    }

    const team = await Team.findById(req.params.id);
    if (!team || !isAdmin(team, req.user.id)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const member = team.members.find((m) => String(m.user) === String(req.params.userId));
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (String(team.owner) === String(req.params.userId)) {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    member.role = role;
    await team.save();
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTeam,
  listTeams,
  getTeam,
  joinTeam,
  setActiveTeam,
  clearActiveTeam,
  regenerateInvite,
  updateMemberRole,
};
