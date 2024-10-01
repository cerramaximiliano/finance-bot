const fs = require("fs");
const path = require("path");
const {logger} = require("../utils/logger");

require("dotenv").config();
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

const envFilePath = path.resolve(__dirname, "..", "..", envFile);

function rotateApiKey(apiPrefix, maxUsage = 100) {
  const keys = Object.keys(process.env).filter(
    (key) => key.startsWith(apiPrefix) && key.includes("KEY_")
  );
  const currentKeyEnv = `${apiPrefix}_CURRENT_KEY`;
  const usageCountEnv = `${apiPrefix}_USAGE_COUNT`;
  let currentKey = process.env[currentKeyEnv];
  let usageCount = parseInt(process.env[usageCountEnv], 10);
  //console.log("Current key and usage count:", currentKey, usageCount);
  if (usageCount >= maxUsage) {
    let currentIndex = keys.indexOf(currentKeyEnv);
    // Find the index of the current key in the keys array
    currentIndex = keys.indexOf(currentKey);
    //console.log("Current index:", currentIndex);
    // Rotate to the next key
    currentKey = keys[(currentIndex + 1) % keys.length];
    usageCount = 0;
    logger.warn(`rotate to key ${currentKey}`)
    updateEnvFile(currentKeyEnv, currentKey, usageCountEnv, usageCount);
  } else {
    usageCount++;
    updateEnvFile(currentKeyEnv, currentKey, usageCountEnv, usageCount);
  }
  return process.env[currentKey];
}

function updateEnvFile(currentKeyEnv, currentKey, usageCountEnv, usageCount) {
  const envConfig = fs.readFileSync(envFilePath, "utf-8");
  const newEnvConfig = envConfig
    .replace(
      new RegExp(`${currentKeyEnv}=.*`),
      `${currentKeyEnv}=${currentKey}`
    )
    .replace(
      new RegExp(`${usageCountEnv}=.*`),
      `${usageCountEnv}=${usageCount}`
    );
  fs.writeFileSync(envFilePath, newEnvConfig);

  // Reload the .env variables
  process.env[currentKeyEnv] = currentKey;
  process.env[usageCountEnv] = usageCount.toString();
}
//"API2_USAGE_COUNT"
function updateApiUsageCount(api, newUsageCount) {
  const usageCountEnv = api;
  const envConfig = fs.readFileSync(envFilePath, "utf-8");
  const newEnvConfig = envConfig.replace(
    new RegExp(`${usageCountEnv}=.*`),
    `${usageCountEnv}=${newUsageCount}`
  );
  fs.writeFileSync(envFilePath, newEnvConfig);
  //console.log("usage API update to", newUsageCount)
  // Reload the .env variable
  process.env[usageCountEnv] = newUsageCount.toString();
}

module.exports = {rotateApiKey, updateApiUsageCount};
