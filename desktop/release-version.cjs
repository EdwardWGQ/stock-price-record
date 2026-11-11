'use strict';
const { newer } = require('./update-policy.cjs');
const stable = /^\d+\.\d+\.\d+$/;

function nextVersion(baseline, latest) {
  if (!stable.test(baseline) || latest && !stable.test(latest)) throw new Error('A stable desktop version is required');
  if (!latest || newer(baseline, latest)) return baseline;
  const parts = latest.split('.').map(Number);
  parts[2]++;
  return parts.join('.');
}

async function prepare() {
  const fs = require('node:fs');
  const { execFileSync } = require('node:child_process');
  const repository = process.env.GH_REPO;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !process.env.GH_TOKEN) throw new Error('Repository authentication required');
  const baseline = require('./package.json').version;
  const currentTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
  const endpoint = `https://api.github.com/repos/${repository}`;
  async function get(path) {
    const response = await fetch(`${endpoint}${path}`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GH_TOKEN}`, 'User-Agent': 'Desktop-Release-Version' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Release metadata unavailable (${response.status})`);
    return response.json();
  }
  const releases = (await get('/releases?per_page=100')).filter(release => !release.prerelease && /^desktop-v\d+\.\d+\.\d+$/.test(release.tag_name));
  const published = releases.filter(release => !release.draft).sort((left, right) => {
    const a = left.tag_name.slice('desktop-v'.length), b = right.tag_name.slice('desktop-v'.length);
    return newer(a, b) ? -1 : newer(b, a) ? 1 : 0;
  });
  const latest = published[0];
  if (latest) {
    const commit = await get(`/commits/${encodeURIComponent(latest.tag_name)}`);
    if (commit.commit.tree.sha === currentTree) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `build=false\ntag=${latest.tag_name}\nversion=${latest.tag_name.slice('desktop-v'.length)}\n`);
      console.log('This source is already published; preserving the existing release.');
      return;
    }
  }
  const version = nextVersion(baseline, latest?.tag_name.slice('desktop-v'.length));
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `build=true\ntag=desktop-v${version}\nversion=${version}\n`);
  console.log(`Preparing desktop ${version} for the updated website.`);
}

module.exports = { nextVersion };
if (require.main === module) prepare().catch(error => { console.error(error.message); process.exitCode = 1; });
