// utils/flattenUpdates.js
const flattenUpdates = (updates) => {
  const flattened = {};

  for (const key in updates) {
    if (
      typeof updates[key] === "object" &&
      updates[key] !== null &&
      !Array.isArray(updates[key])
    ) {
      for (const subKey in updates[key]) {
        flattened[`${key}.${subKey}`] = updates[key][subKey];
      }
    } else {
      flattened[key] = updates[key];
    }
  }

  // Only proceed with the update if the address contains actual data
  if (flattened.address && Object.keys(flattened.address).length === 0) {
    delete flattened.address; // Remove empty address if present
  }

  return flattened;
};

module.exports = flattenUpdates;
