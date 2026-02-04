const fs = require('fs');
const path = require('path');

async function getPackageVersion() {
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function incrementVersion(version, versionType) {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (versionType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown version type: ${versionType}`);
  }
}

async function getReleaseLine(changeset, versionType, changelogOpts) {
  const newVersion = changelogOpts?.newVersion || incrementVersion(await getPackageVersion(), versionType);
  const date = new Date().toISOString().split('T')[0];
  const releaseDateAndLink = `### [${newVersion}](https://www.npmjs.com/package/taskflow-mcp/v/${newVersion}) - ${date}`;
  return `${releaseDateAndLink}\n\n${changeset.summary}`;
}

async function getDependencyReleaseLine(changesets, dependenciesUpdated, changelogOpts) {
  return '';
}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
};
