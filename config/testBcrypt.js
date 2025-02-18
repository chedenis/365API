const bcrypt = require('bcryptjs');

const password = "thisisnewpassword"; // Replace with the plain password

async function testPassword(){
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(password, salt);
  console.log("Generated Hash:", newHash);
  // Check if the new hash matches the original hash
  const isMatch = await bcrypt.compare(password, newHash);
  console.log("Does the password match the new hash?", isMatch);  // Should log true
}

testPassword();

