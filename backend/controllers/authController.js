const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getQuotaInfo, refreshDailyQuota } = require('../middleware/quota');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      quota: getQuotaInfo(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await refreshDailyQuota(user);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      activeTeam: user.activeTeam,
      quota: getQuotaInfo(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('activeTeam', 'name slug');
    if (!user) return res.status(404).json({ message: 'User not found' });
    await refreshDailyQuota(user);
    res.json({
      ...user.toObject(),
      quota: getQuotaInfo(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Demo upgrade endpoint — sets plan to pro (portfolio SaaS simulation) */
const upgradePlan = async (req, res) => {
  try {
    const plan = req.body.plan === 'free' ? 'free' : 'pro';
    const user = await User.findByIdAndUpdate(req.user.id, { plan }, { new: true }).select('-password');
    res.json({ ...user.toObject(), quota: getQuotaInfo(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe, upgradePlan };
