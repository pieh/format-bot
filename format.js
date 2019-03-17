const path = require("path");
const fs = require(`fs-extra`);
const { pExec, repo, owner } = require(`./utils`);

const accessToken = process.env.GITHUB_ACCESS_TOKEN;

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

const getPRBranchInfo = async context => {
  const { octokit, args } = context;
  const result = await octokit.pulls.get({
    owner,
    repo,
    number: args.pr
  });

  return {
    ref: result.data.head.ref,
    owner: result.data.head.repo.owner.login,
    repo: result.data.head.repo.name
  };
};

exports.format = async context => {
  const { args } = context;
  const repoCloneDir = path.join(process.cwd(), `_pr_clone_${args.pr}`);

  const PRBranchInfo = await getPRBranchInfo(context);

  const execArgs = {
    stdio: `inherit`
  };

  try {
    const cloneCmd = `git clone --single-branch --branch ${
      PRBranchInfo.ref
    } https://${accessToken}@github.com/${PRBranchInfo.owner}/${
      PRBranchInfo.repo
    }.git ${repoCloneDir}`;
    //const installDepsCmd = `yarn --production=false`;
    const runFormatCmd = `yarn format`;
    const stageFilesCmd = `git add .`;
    const unstageYarnLockCmd = `git reset HEAD yarn.lock`;
    const gitConfigEmailCmd = `git config user.email "misiek.piechowiak@gmail.com"`;
    const gitConfigNameCmd = `git config user.name "GatsbyJS Bot"`;
    const commitFilesCmd = `git commit --author="GatsbyJS Bot<misiek.piechowiak@gmail.com>" --no-verify -m "chore: format"`;
    const pushCmd = `git push origin ${PRBranchInfo.ref}`;

    await pExec(cloneCmd, execArgs);
    execArgs.cwd = repoCloneDir;

    // const restorePackageJson = await disableWorkspaces(repoCloneDir);

    // await pExec(installDepsCmd, execArgs);

    // await restorePackageJson();

    try {
      await pExec(runFormatCmd, execArgs);
    } catch {
    } finally {
      await pExec(gitConfigEmailCmd, execArgs);
      await pExec(gitConfigNameCmd, execArgs);
      await pExec(stageFilesCmd, execArgs);
      await pExec(unstageYarnLockCmd, execArgs);
      await pExec(commitFilesCmd, execArgs);
      await pExec(pushCmd, execArgs);
    }
  } finally {
    await fs.removeSync(repoCloneDir);
  }
};
