const fs = require('fs');
const path = require('path');

exports.ensureDataDir = function(baseDir) {
  const dataDir = path.join(baseDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  return dataDir;
};

exports.saveJson = function(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

exports.saveChart = function(buffer, filePath) {
  fs.writeFileSync(filePath, buffer);
}; 