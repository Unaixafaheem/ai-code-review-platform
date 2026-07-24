const User = require('../models/User');

const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || 20);

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function refreshDailyQuota(user) {
  const today = startOfUtcDay();
  const resetAt = user.reviewsResetAt ? startOfUtcDay(new Date(user.reviewsResetAt)) : null;
  if (!resetAt || resetAt.getTime() < today.getTime()) {
    user.reviewsToday = 0;
    user.reviewsResetAt = today;
    await user.save();
  }
  return user;
}

/**
 * Attach full user doc and enforce free-tier daily quota on AI routes.
 */
const attachUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    await refreshDailyQuota(user);
    req.userDoc = user;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const checkQuota = async (req, res, next) => {
  try {
    const user = req.userDoc || (await User.findById(req.user.id));
    if (!user) return res.status(401).json({ message: 'User not found' });
    await refreshDailyQuota(user);
    req.userDoc = user;

    if (user.plan === 'pro') {
      req.quota = { plan: 'pro', limit: null, used: user.reviewsToday, remaining: null };
      return next();
    }

    const remaining = Math.max(0, FREE_DAILY_LIMIT - user.reviewsToday);
    req.quota = { plan: 'free', limit: FREE_DAILY_LIMIT, used: user.reviewsToday, remaining };

    if (user.reviewsToday >= FREE_DAILY_LIMIT) {
      return res.status(429).json({
        message: `Free plan limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited reviews.`,
        quota: req.quota,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function consumeQuota(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  await refreshDailyQuota(user);
  user.reviewsToday += 1;
  await user.save();
  return user;
}

function getQuotaInfo(user) {
  if (user.plan === 'pro') {
    return { plan: 'pro', limit: null, used: user.reviewsToday, remaining: null };
  }
  return {
    plan: 'free',
    limit: FREE_DAILY_LIMIT,
    used: user.reviewsToday,
    remaining: Math.max(0, FREE_DAILY_LIMIT - user.reviewsToday),
  };
}

module.exports = {
  attachUser,
  checkQuota,
  consumeQuota,
  refreshDailyQuota,
  getQuotaInfo,
  FREE_DAILY_LIMIT,
};
