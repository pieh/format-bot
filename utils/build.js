const Octokit = require("@octokit/rest");
const fs = require(`fs-extra`);
const _ = require(`lodash`);

const { pExec } = require(`.`);
const { repo, owner } = require(`../common`);

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

  const currentPackageJson = require(`../package.json`);

  delete packageJson.devDependencies[`husky`];
  delete packageJson.devDependencies[`lint-staged`];

  currentPackageJson.devDependencies = packageJson.devDependencies;

  if (!process.env.SKIP_DEPS) {
    await fs.outputFile(
      `./package.json`,
      JSON.stringify(currentPackageJson, null, 2)
    );

    console.log("augmenting package.json");
    await pExec(`yarn --production=false`);
  }

  return packageJson["lint-staged"];
};

exports.addGatsbyDevDeps = _.memoize(addGatsbyDevDeps);

// addGatsbyDevDeps();
