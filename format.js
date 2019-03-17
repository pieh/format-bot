const path = require("path");
const fs = require(`fs-extra`);
const { pExec, repo, owner } = require(`./utils`);
const micromatch = require("micromatch");

const accessToken = process.env.GITHUB_ACCESS_TOKEN;

// const disableWorkspaces = async repoCloneDir => {
//   console.log("> Disabling workspaces");
//   const packageJsonPath = path.join(repoCloneDir, "package.json");
//   const packageJsonString = await fs.readFile(packageJsonPath, "utf-8");
//   const packageJson = JSON.parse(packageJsonString);

//   delete packageJson.workspaces;

//   console.log(JSON.stringify(packageJson));

//   await fs.outputFile(packageJsonPath, JSON.stringify(packageJson));

//   return async () => {
//     console.log("> Re-enabling workspaces");
//     await fs.outputFile(packageJsonPath, packageJsonString);
//   };
//   // const package require
// };

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

const getChangedFiles = async context => {
  const { octokit, args } = context;
  const result = await octokit.pulls.listFiles({
    owner,
    repo,
    number: args.pr
  });

  return result.data
    .filter(file => file.status !== "removed")
    .map(file => file.filename);
};

exports.format = async context => {
  const { args } = context;
  const repoCloneDir = path.join(process.cwd(), `_pr_clone_${args.pr}`);

  const PRBranchInfo = await getPRBranchInfo(context);
  const changedFiles = await getChangedFiles(context);

  const formats = Object.keys(context.lintStagedConf);

  const tasks = formats.map(format => {
    const fileList = micromatch(changedFiles, format, {
      matchBase: true,
      dot: true
    });

    return { format, fileList, commands: context.lintStagedConf[format] };
  });

  if (!tasks.some(task => task.fileList.length > 0)) {
    console.log("Nothing to format");
    return;
  }

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

    await pExec(gitConfigEmailCmd, execArgs);
    await pExec(gitConfigNameCmd, execArgs);
    // await pExec(stageFilesCmd, execArgs);
    // await pExec(unstageYarnLockCmd, execArgs);
    await pExec(commitFilesCmd, execArgs);
    await pExec(pushCmd, execArgs);
  } finally {
    await fs.removeSync(repoCloneDir);
  }
};
