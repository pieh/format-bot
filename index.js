const childProcess = require("child_process");
const path = require("path");
const express = require(`express`);
const fs = require(`fs-extra`);
require("dotenv").config();

const accessToken = process.env.GITHUB_ACCESS_TOKEN;
const user = `pieh`;

const pExec = (command, args = {}) =>
  new Promise((resolve, reject) => {
    childProcess.exec(command, args, (err, stdout, stderr) => {
      console.error(stderr);
      console.log(stdout);
      if (err) {
        reject(err);
      }

      resolve();
    });
  });

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

  const cloneCmd = `git clone --single-branch --branch ${
    PRBranchInfo.ref
  } https://${accessToken}@github.com/${PRBranchInfo.owner}/${
    PRBranchInfo.repo
  }.git ${repoCloneDir}`;
  const installDepsCmd = `yarn`;
  const runFormatCmd = `yarn format`;
  const stageFilesCmd = `git add .`;
  const commitFilesCmd = `git commit --author="pieh-peril-test<misiek.piechowiak@gmail.com>" -m "chore: format"`;
  const pushCmd = `git push origin ${PRBranchInfo.ref}`;

  console.log(cloneCmd);

  await pExec(cloneCmd, execArgs);
  execArgs.cwd = repoCloneDir;
  await pExec(installDepsCmd, execArgs);
  await pExec(runFormatCmd, execArgs);
  await pExec(stageFilesCmd, execArgs);
  await pExec(commitFilesCmd, execArgs);
  await pExec(pushCmd, execArgs);

  await fs.removeSync(repoCloneDir);
};

const app = express();

app.get(`/format`, (req, res) => {
  if (req && req.query && req.query.pr) {
    handler(req.query.pr);
    res.send("running");
    return;
  }

  res.send("missing stuff");
});

app.listen(80, () => {
  console.log("Server started");
});
