// utils/flattenUpdates.js
const flattenUpdates = (updates) => {
    const flattened = {};
    
    for (const key in updates) {
      if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
        for (const subKey in updates[key]) {
          flattened[`${key}.${subKey}`] = updates[key][subKey];
        }
      } else {
        flattened[key] = updates[key];
      }
    }
  
    return flattened;
  };
  
  module.exports = flattenUpdates;
  