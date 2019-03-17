const _ = require(`lodash`);

const octokit = require(`../utils/octokit`);

const GatsbyAdminTeamID = `2772524`;

const getAdminTeamMembersImpl = async () => {
  const results = await octokit.teams.listMembers({
    team_id: GatsbyAdminTeamID
  });

  return results.data.map(user => {
    return `github|${user.id}`;
  });
};

const getAdminTeamMembers = _.memoize(getAdminTeamMembersImpl);
exports.getAdminTeamMembers = getAdminTeamMembers;

exports.getPermissions = async user => {
  if (user) {
    const team = await getAdminTeamMembers();

    if (team.includes(user.sub)) {
      return {
        canFormat: true
      };
    }
  }

  return {
    canFormat: false
  };
};
