const _ = require(`lodash`);

const octokit = require(`../utils/octokit`);
const { repo, owner } = require(`../common`);

const getPrListWithStatusesImpl = async () => {
  let prs = [];
  let page = 1;
  let prsPage = null;
  do {
    prsPage = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
      page: page++
    });
    prs = prs.concat(prsPage.data);
  } while (prsPage && prsPage.data.length >= 100);

  const prsWithStatuses = await Promise.all(
    prs.map(async pr => {
      const result = await octokit.repos.getCombinedStatusForRef({
        owner,
        repo,
        ref: pr.head.sha
      });
      pr.checks = result.data;
      return pr;
    })
  );

  return prsWithStatuses.map(pr => {
    const lintCheck = pr.checks.statuses.find(check => {
      return /lint/g.test(check.context);
    });

    return {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      lintStatus: lintCheck ? lintCheck.state.toUpperCase() : "NONE"
    };
  });
};

exports.getPrListWithStatuses = _.memoize(getPrListWithStatusesImpl);
