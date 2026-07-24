const { enqueueJob, getJobStatus } = require('../services/queueService');
const { writeAudit } = require('../services/auditService');

const enqueueGithub = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url?.trim()) return res.status(400).json({ message: 'GitHub URL is required' });

    const job = await enqueueJob('github', {
      url: url.trim(),
      userId: req.user.id,
      teamId: req.userDoc?.activeTeam || null,
    });

    await writeAudit({
      actor: req.user.id,
      team: req.userDoc?.activeTeam,
      action: 'job.github.enqueue',
      resourceType: 'job',
      resourceId: job.id,
      meta: { url, mode: job.mode },
      req,
    });

    res.status(202).json({
      jobId: job.id,
      mode: job.mode,
      statusUrl: `/api/jobs/${job.id}`,
      message: job.queued ? 'Job queued' : 'Job processing inline (no Redis)',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const enqueueMultifile = async (req, res) => {
  try {
    let files = req.body.files;
    if (req.extractedFiles?.length) files = req.extractedFiles;
    if (!Array.isArray(files) || !files.length) {
      return res.status(400).json({ message: 'Provide files[] or upload a .zip' });
    }

    const job = await enqueueJob('multifile', {
      files,
      userId: req.user.id,
      teamId: req.userDoc?.activeTeam || null,
    });

    await writeAudit({
      actor: req.user.id,
      team: req.userDoc?.activeTeam,
      action: 'job.multifile.enqueue',
      resourceType: 'job',
      resourceId: job.id,
      meta: { fileCount: files.length, mode: job.mode },
      req,
    });

    res.status(202).json({
      jobId: job.id,
      mode: job.mode,
      statusUrl: `/api/jobs/${job.id}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getJob = async (req, res) => {
  try {
    const status = await getJobStatus(req.params.id);
    if (!status) return res.status(404).json({ message: 'Job not found' });
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { enqueueGithub, enqueueMultifile, getJob };
