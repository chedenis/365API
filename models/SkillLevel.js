// models/SkillLevel.js
const mongoose = require('mongoose');

const skillLevelSchema = new mongoose.Schema({
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    required: true 
  },
  selfRating: { 
    type: Number, 
    min: 1.0, 
    max: 6.0, 
    required: true 
  },
  DUPR: { 
    type: Number, 
    min: 1.0, 
    max: 6.0, 
    required: true 
  },
  UTPR: { 
    type: Number, 
    min: 1.0, 
    max: 6.0, 
    required: true 
  }
}, { _id: false });

module.exports = skillLevelSchema;
