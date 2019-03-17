const Octokit = require("@octokit/rest");
const { pExec, repo, owner } = require(`./utils`);
const fs = require(`fs-extra`);

require("dotenv").config();

const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_ACCESS_TOKEN}`
});

const addGatsbyDevDeps = async () => {
  const data = await octokit.repos.getContents({
    owner,
    repo,
    path: `package.json`
  });
  const content = Buffer.from(data.data.content, data.data.encoding).toString(
    "utf-8"
  );

  const packageJson = JSON.parse(content);

  const currentPackageJson = require(`./package.json`);

  currentPackageJson.devDependencies = packageJson.devDependencies;

  await fs.outputFile(
    `./package.json`,
    JSON.stringify(currentPackageJson, null, 2)
  );

  await pExec(`yarn`)
};

addGatsbyDevDeps();
