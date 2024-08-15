// controllers/userController.js
const User = require('../models/User');
const flattenUpdates = require('../utils/flattenUpdates');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user profile', err);
    res.status(500).json({ error: 'Error fetching user profile', details: err.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const updates = flattenUpdates(req.body);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      {
        new: true, // Return the updated document
        runValidators: true, // Ensure the updates are validated against the schema
        context: 'query' // Needed for certain validators
      }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('Error updating user profile', err);
    res.status(500).json({ error: 'Error updating user profile', details: err.message });
  }
};
