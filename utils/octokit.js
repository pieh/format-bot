const Octokit = require("@octokit/rest");

const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_ACCESS_TOKEN}`
});

module.exports = octokit;
