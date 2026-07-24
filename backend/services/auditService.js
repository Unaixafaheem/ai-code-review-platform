const AuditLog = require('../models/AuditLog');

async function writeAudit({
  actor,
  team,
  action,
  resourceType = 'review',
  resourceId,
  meta,
  req,
}) {
  try {
    await AuditLog.create({
      actor: actor || undefined,
      team: team || undefined,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      meta,
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || undefined,
      userAgent: req?.headers?.['user-agent'] || undefined,
    });
  } catch (err) {
    console.warn('[audit]', err.message);
  }
}

module.exports = { writeAudit };
