const axios = require('axios');

function parseGithubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) throw new Error('Invalid GitHub URL. Example: https://github.com/owner/repo');
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function fetchRepoData(githubUrl) {
  const { owner, repo } = parseGithubUrl(githubUrl);
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const base = `https://api.github.com/repos/${owner}/${repo}`;

  const [repoRes, readmeRes, treeRes, languagesRes] = await Promise.allSettled([
    axios.get(base, { headers, timeout: 15000 }),
    axios.get(`${base}/readme`, { headers, timeout: 15000 }),
    axios.get(`${base}/git/trees/main?recursive=1`, { headers, timeout: 15000 }).catch(() =>
      axios.get(`${base}/git/trees/master?recursive=1`, { headers, timeout: 15000 })
    ),
    axios.get(`${base}/languages`, { headers, timeout: 15000 }),
  ]);

  if (repoRes.status === 'rejected') {
    throw new Error('Repository not found or API rate limit exceeded');
  }

  const repoData = repoRes.value.data;
  let readme = '';
  if (readmeRes.status === 'fulfilled' && readmeRes.value.data?.content) {
    readme = Buffer.from(readmeRes.value.data.content, 'base64').toString('utf-8').slice(0, 4000);
  }

  let fileTree = [];
  if (treeRes.status === 'fulfilled') {
    fileTree = (treeRes.value.data.tree || [])
      .filter((f) => f.type === 'blob')
      .map((f) => f.path)
      .slice(0, 80);
  }

  const languages =
    languagesRes.status === 'fulfilled' ? Object.keys(languagesRes.value.data) : [];

  // Fetch key config files
  const keyFiles = ['package.json', 'README.md', 'docker-compose.yml', 'Dockerfile', 'requirements.txt'];
  const configs = {};

  await Promise.all(
    keyFiles.map(async (file) => {
      try {
        const { data } = await axios.get(`${base}/contents/${file}`, { headers, timeout: 10000 });
        if (data.content) {
          configs[file] = Buffer.from(data.content, 'base64').toString('utf-8').slice(0, 2000);
        }
      } catch {
        /* file may not exist */
      }
    })
  );

  return {
    owner,
    repo,
    description: repoData.description || '',
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    defaultBranch: repoData.default_branch,
    topics: repoData.topics || [],
    languages,
    readme,
    fileTree,
    configs,
  };
}

module.exports = { parseGithubUrl, fetchRepoData };
