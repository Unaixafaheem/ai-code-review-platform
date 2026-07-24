const UsageEvent = require('../models/UsageEvent');
const Review = require('../models/Review');
const Team = require('../models/Team');
const { getQuotaInfo, refreshDailyQuota } = require('../middleware/quota');
const User = require('../models/User');

const getAnalytics = async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const teamIds = (
      await Team.find({ 'members.user': req.user.id }).select('_id')
    ).map((t) => t._id);

    const match = {
      createdAt: { $gte: since },
      $or: [{ user: req.user.id }, ...(teamIds.length ? [{ team: { $in: teamIds } }] : [])],
    };

    const [byDay, byTask, byLanguage, totals, recent] = await Promise.all([
      UsageEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            tokens: { $sum: '$tokensEst' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      UsageEvent.aggregate([
        { $match: match },
        { $group: { _id: '$taskType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      UsageEvent.aggregate([
        { $match: match },
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      UsageEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            reviews: { $sum: 1 },
            tokens: { $sum: '$tokensEst' },
            avgLatency: { $avg: '$latencyMs' },
          },
        },
      ]),
      Review.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('taskType language createdAt tokensEst latencyMs'),
    ]);

    const user = await User.findById(req.user.id);
    await refreshDailyQuota(user);

    res.json({
      days,
      byDay: byDay.map((d) => ({ date: d._id, count: d.count, tokens: d.tokens })),
      byTask: byTask.map((d) => ({ taskType: d._id, count: d.count })),
      byLanguage: byLanguage.map((d) => ({ language: d._id || 'unknown', count: d.count })),
      totals: {
        reviews: totals[0]?.reviews || 0,
        tokens: totals[0]?.tokens || 0,
        avgLatencyMs: Math.round(totals[0]?.avgLatency || 0),
      },
      recent,
      quota: getQuotaInfo(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAnalytics };
