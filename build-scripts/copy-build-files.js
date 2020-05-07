const fs = require('fs-extra');
const path = require('path');
const rmrf = require('rmrf-promise');
const omit = require('lodash/omit');

(async function() {
  try {

    const buildDir = path.resolve(__dirname, '../dist-native');
    const tempDir = path.resolve(__dirname, '../temp');

    await rmrf(buildDir);
    await rmrf(tempDir);

    await fs.ensureDir(tempDir);
    await fs.ensureDir(buildDir);

    const filesToCopy = [
      'dist',
      'public',
      'yarn.lock'
    ];

    for(const file of filesToCopy) {
      await fs.copy(file, path.join(tempDir, file));
    }

    const packageJSON = await fs.readJson('package.json');

    const newPackageJSON = omit(packageJSON, ['build', 'devDependencies']);

    await fs.writeJson(path.join(tempDir, 'package.json'), newPackageJSON, {spaces: 2});

  } catch(err) {
    console.error(err);
  }
})();
