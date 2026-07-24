const { runInSandbox } = require('../services/sandboxService');
const { writeAudit } = require('../services/auditService');
const { scanSecrets } = require('../services/secretScanner');

const executeCode = async (req, res) => {
  try {
    const { code, language = 'javascript', stdin = '', expectedOutput } = req.body;
    if (!code?.trim()) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const secrets = scanSecrets(code);
    if (secrets.length && !req.body.acknowledgeSecrets && !req.body.redactSecrets) {
      return res.status(400).json({
        message: 'Secrets detected — refuse to execute until acknowledged/redacted',
        secrets,
        code: 'SECRETS_DETECTED',
      });
    }

    const source = req.body.redactSecrets
      ? require('../services/secretScanner').redactSecrets(code).redacted
      : code;

    const result = await runInSandbox({
      source,
      language,
      stdin,
      expectedOutput,
    });

    await writeAudit({
      actor: req.user.id,
      team: req.userDoc?.activeTeam,
      action: 'sandbox.execute',
      resourceType: 'sandbox',
      meta: { language, provider: result.provider, status: result.status },
      req,
    });

    res.json(result);
  } catch (error) {
    console.error('Sandbox error:', error.message);
    res.status(500).json({ message: error.message || 'Sandbox execution failed' });
  }
};

module.exports = { executeCode };
