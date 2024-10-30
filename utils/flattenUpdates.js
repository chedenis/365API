// utils/flattenUpdates.js
const flattenUpdates = (updates) => {
  const flattened = {};

  for (const key in updates) {
    if (
      typeof updates[key] === "object" &&
      updates[key] !== null &&
      !Array.isArray(updates[key])
    ) {
      // Handle dropInHours and operatingHours (multi-time ranges)
      if (key === "operatingHours" || key === "dropInHours") {
        flattened[key] = updates[key]; // Do not flatten time groups, keep them nested
      } else {
        // Flatten other objects (like address) normally
        for (const subKey in updates[key]) {
          flattened[`${key}.${subKey}`] = updates[key][subKey];
        }
      }
    } else {
      flattened[key] = updates[key];
    }
  }

  // Keep your original logic for address
  if (flattened.address && Object.keys(flattened.address).length === 0) {
    delete flattened.address; // Remove empty address if present
  }

  return flattened;
};

module.exports = flattenUpdates;
