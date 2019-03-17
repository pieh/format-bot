const path = require("path");
const fs = require(`fs-extra`);
const { pExec } = require(`../utils`);
const { repo, owner } = require(`../common`);
const micromatch = require("micromatch");

const octokit = require(`../utils/octokit`);
const { getLintStagedConf } = require(`../utils/init`);

const accessToken = process.env.GITHUB_ACCESS_TOKEN;

const getPRBranchInfo = async pr => {
  const result = await octokit.pulls.get({
    owner,
    repo,
    number: pr
  });

  return {
    ref: result.data.head.ref,
    owner: result.data.head.repo.owner.login,
    repo: result.data.head.repo.name
  };
};

const getChangedFiles = async pr => {
  const result = await octokit.pulls.listFiles({
    owner,
    repo,
    number: pr
  });

  return result.data
    .filter(file => file.status !== "removed")
    .map(file => file.filename);
};

module.exports = async ({ pr }, { setStatus }) => {
  const repoCloneDir = path.join(process.cwd(), `_pr_clone_${pr}`);

  setStatus(`Getting branch information`);
  const PRBranchInfo = await getPRBranchInfo(pr);
  setStatus(`Getting list of changed files`);
  const changedFiles = await getChangedFiles(pr);

  const lintStagedConf = await getLintStagedConf();

  const formats = Object.keys(lintStagedConf);

  const tasks = formats.map(format => {
    const fileList = micromatch(changedFiles, format, {
      matchBase: true,
      dot: true
    });

    return { format, fileList, commands: lintStagedConf[format] };
  });

  // await new Promise(resolve => setTimeout(resolve, 4000));
  // return;

  if (!tasks.some(task => task.fileList.length > 0)) {
    console.log("Nothing to format");
    return;
  }

  const execArgs = {
    stdio: `inherit`
  };

  try {
    setStatus(`Cloning`);
    const cloneCmd = `git clone --single-branch --branch ${
      PRBranchInfo.ref
    } https://${accessToken}@github.com/${PRBranchInfo.owner}/${
      PRBranchInfo.repo
    }.git ${repoCloneDir}`;
    //const installDepsCmd = `yarn --production=false`;
    // const runFormatCmd = `yarn format`;
    // const stageFilesCmd = `git add .`;
    // const unstageYarnLockCmd = `git reset HEAD yarn.lock`;
    const gitConfigEmailCmd = `git config user.email "misiek.piechowiak@gmail.com"`;
    const gitConfigNameCmd = `git config user.name "GatsbyJS Bot"`;
    const commitFilesCmd = `git commit --author="GatsbyJS Bot<misiek.piechowiak@gmail.com>" --no-verify -m "chore: format"`;
    const pushCmd = `git push origin ${PRBranchInfo.ref}`;

    await pExec(cloneCmd, execArgs);
    execArgs.cwd = repoCloneDir;

    // const restorePackageJson = await disableWorkspaces(repoCloneDir);
    setStatus(`Formatting`);
    // await pExec(installDepsCmd, execArgs);
    await Promise.all(
      tasks.map(async ({ fileList, commands }) => {
        if (fileList.length <= 0) {
          return;
        }
        for (let command of commands) {
          const cmd = [command.bin, ...command.args, ...fileList].join(` `);
          try {
            await pExec(cmd, execArgs);
          } catch {}
        }
      })
    );

    // await restorePackageJson();

    // await pExec(runFormatCmd, execArgs);
    setStatus(`Committing and pushing`);
    await pExec(gitConfigEmailCmd, execArgs);
    await pExec(gitConfigNameCmd, execArgs);
    // await pExec(stageFilesCmd, execArgs);
    // await pExec(unstageYarnLockCmd, execArgs);
    await pExec(commitFilesCmd, execArgs);
    await pExec(pushCmd, execArgs);
  } finally {
    setStatus(`Cleaning up`);
    await fs.removeSync(repoCloneDir);
  }
};
