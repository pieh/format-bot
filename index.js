require("dotenv").config();

const express = require(`express`);

const { format } = require(`./utils/queue`);
const { createServer } = require("./schema");
const { getAdminTeamMembers } = require(`./schema/permissions`);

const app = express();

app.get(`/format`, async (req, res) => {
  if (req && req.query && req.query.pr) {
    format(req.query.pr);
    res.send("running");
    return;
  }

  res.send("missing stuff");
});

const graphqlserver = createServer(app);

getAdminTeamMembers();

graphqlserver.listen(process.env.PORT, async () => {
  // console.log(
  //   `🚀 Server ready at http://localhost:${process.env.PORT}${
  //     graphqlserver.graphqlPath
  //   }`
  // );
  // console.log(
  //   `🚀 Subscriptions ready at ws://localhost:${process.env.PORT}${
  //     graphqlserver.subscriptionsPath
  //   }`
  // );
});
