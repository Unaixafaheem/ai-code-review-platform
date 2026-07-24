const AuditLog = require('../models/AuditLog');
const Team = require('../models/Team');

const listAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const teamIds = (await Team.find({ 'members.user': req.user.id }).select('_id')).map(
      (t) => t._id
    );

    const filter = {
      $or: [
        { actor: req.user.id },
        ...(teamIds.length ? [{ team: { $in: teamIds } }] : []),
      ],
    };

    if (req.query.action) filter.action = req.query.action;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name email')
      .populate('team', 'name slug');

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listAuditLogs };
