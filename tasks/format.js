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
    pull_number: pr
  });

  return {
    title: result.data.title,
    mergeable: result.data.mergeable,
    rebaseable: result.data.rebaseable,
    mergeable_state: result.data.mergeable_state,
    ref: result.data.head.ref,
    owner: result.data.head.repo.owner.login,
    repo: result.data.head.repo.name
  };
};

const getChangedFiles = async pr => {
  const result = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pr
  });

  return result.data
    .filter(file => file.status !== "removed")
    .map(file => file.filename);
};

module.exports = async (
  { pr, mergeMaster },
  { setStatus, updateText, getText }
) => {
  const initialText = getText();

  const repoCloneDir = path.join(process.cwd(), `_pr_clone_${pr}`);

  setStatus(`Getting branch information`);
  const PRBranchInfo = await getPRBranchInfo(pr);
  updateText(`${initialText}\n\`\`\`${PRBranchInfo.title}\`\`\``);

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

  console.log({
    changedFiles,
    formats,
    tasks
  });

  if (!mergeMaster && !tasks.some(task => task.fileList.length > 0)) {
    console.log("Nothing to format");
    return;
  }

  const execArgs = {
    stdio: `inherit`
  };

  try {
    setStatus(`Cloning PR branch`);
    const cloneCmd = `git clone --single-branch --branch "${
      PRBranchInfo.ref
    }" ${mergeMaster ? `` : `--depth=1`} https://${accessToken}@github.com/${
      PRBranchInfo.owner
    }/${PRBranchInfo.repo}.git ${repoCloneDir}`;

    const gitConfigEmailCmd = `git config user.email "mathews.kyle+gatsbybot@gmail.com"`;
    const gitConfigNameCmd = `git config user.name "gatsbybot"`;
    const commitFilesCmd = `git commit --author="gatsbybot<mathews.kyle+gatsbybot@gmail.com>" --no-verify -m "chore: format"`;
    const pushCmd = `git push origin "${PRBranchInfo.ref}"`;

    await pExec(cloneCmd, execArgs);

    execArgs.cwd = repoCloneDir;

    await pExec(gitConfigEmailCmd, execArgs);
    await pExec(gitConfigNameCmd, execArgs);

    if (mergeMaster) {
      setStatus(`Fetching upstream/master`);
      // create remote
      const addRemoteCmd = `git remote add upstream https://github.com/${owner}/${repo}`;
      await pExec(addRemoteCmd, execArgs);

      const fetchCmd = `git fetch --no-tags upstream master:`;
      await pExec(fetchCmd, execArgs);

      setStatus(`Merging upstream/master`);
      const mergeCmd = `git merge upstream/master`;
      await pExec(mergeCmd, execArgs);
    }

    setStatus(`Formatting`);

    const toComment = [];

    await Promise.all(
      tasks.map(async ({ fileList, commands }) => {
        if (fileList.length <= 0) {
          return;
        }
        for (let command of commands) {
          const cmd = [command.bin, ...command.args, ...fileList].join(` `);
          try {
            await pExec(cmd, execArgs);
          } catch (e) {
            if (command.bin.includes(`prettier`)) {
              toComment.push(e.stderr.replace(/\[error\]/g, ``).trim());
            }
          }
        }
      })
    );

    if (toComment.length > 0) {
      await octokit.issues.createComment({
        owner,
        repo,
        number: pr,
        body: toComment.map(s => `\`\`\`\n${s}\n\`\`\``).join(`\n\n`)
      });
    }

    setStatus(`Committing and pushing`);

    try {
      await pExec(commitFilesCmd, execArgs);
    } catch {
      // commit exits with non-zero if there is nothing to commit
    }
    await await pExec(pushCmd, execArgs);
  } finally {
    await setStatus(`Cleaning up`);
    await fs.removeSync(repoCloneDir);
  }
};
