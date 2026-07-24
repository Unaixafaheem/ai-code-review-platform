const Rule = require('../models/Rule');

async function loadCustomRules(userDoc) {
  const query = [{ user: userDoc._id, enabled: true }];
  if (userDoc.activeTeam) {
    query.push({ team: userDoc.activeTeam, enabled: true });
  }

  const rules = await Rule.find({ $or: query })
    .sort({ createdAt: -1 })
    .limit(30)
    .select('title description language');

  return rules
    .filter((r) => r.language === 'any' || !r.language)
    .concat(rules.filter((r) => r.language && r.language !== 'any'))
    .slice(0, 20)
    .map((r) => ({ title: r.title, description: r.description }));
}

module.exports = { loadCustomRules };
