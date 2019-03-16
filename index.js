const childProcess = require("child_process");
const path = require("path");
const express = require(`express`);
const fs = require(`fs-extra`);
require("dotenv").config();

const accessToken = process.env.GITHUB_ACCESS_TOKEN;
const user = `pieh`;

const pExec = (command, execArgs = {}, log = command) =>
  new Promise((resolve, reject) => {
    console.log(`$ ${log}`);
    childProcess.exec(command, execArgs, (err, stdout, stderr) => {
      console.error(stderr);
      console.log(stdout);
      if (err) {
        reject(err);
      }

      resolve();
    });
  });

const disableWorkspaces = async repoCloneDir => {
  console.log("> Disabling workspaces");
  const packageJsonPath = path.join(repoCloneDir, "package.json");
  const packageJsonString = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonString);

  delete packageJson.workspaces;

  console.log(JSON.stringify(packageJson));

  await fs.outputFile(packageJsonPath, JSON.stringify(packageJson));

  return async () => {
    console.log("> Re-enabling workspaces");
    await fs.outputFile(packageJsonPath, packageJsonString);
  };
  // const package require
};

const handler = async event => {
  const repoCloneDir = path.join(process.cwd(), `_pr_clone_${event.pr}`);

  const PRBranchInfo = {
    ref: `peril-format-test`,
    owner: `pieh`,
    repo: `gatsby`
  };

  const execArgs = {
    stdio: `inherit`
  };

  try {
    const cloneCmd = `git clone --single-branch --branch ${
      PRBranchInfo.ref
    } https://${accessToken}@github.com/${PRBranchInfo.owner}/${
      PRBranchInfo.repo
    }.git ${repoCloneDir}`;
    const installDepsCmd = `yarn --production=false`;
    const runFormatCmd = `yarn format`;
    const stageFilesCmd = `git add .`;
    const gitConfigEmailCmd = `git config user.email "misiek.piechowiak@gmail.com"`;
    const gitConfigNameCmd = `git config user.name "pieh-peril-test"`;
    const commitFilesCmd = `git commit --author="pieh-peril-test<misiek.piechowiak@gmail.com>" -m "chore: format"`;
    const pushCmd = `git push origin ${PRBranchInfo.ref}`;

    await pExec(cloneCmd, execArgs);
    execArgs.cwd = repoCloneDir;

    const restorePackageJson = await disableWorkspaces(repoCloneDir);

    await pExec(installDepsCmd, execArgs);

    await restorePackageJson();

    try {
      await pExec(runFormatCmd, execArgs);
    } catch {
    } finally {
      await pExec(gitConfigEmailCmd, execArgs);
      await pExec(gitConfigNameCmd, execArgs);
      await pExec(stageFilesCmd, execArgs);
      await pExec(commitFilesCmd, execArgs);
      await pExec(pushCmd, execArgs);
    }
  } finally {
    await fs.removeSync(repoCloneDir);
  }
};

const app = express();

app.get(`/format`, (req, res) => {
  if (req && req.query && req.query.pr) {
    console.log(req.query);
    handler(req.query);
    res.send("running");
    return;
  }

  res.send("missing stuff");
});

app.listen(process.env.PORT, () => {
  console.log("Server started");
});
