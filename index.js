require("dotenv").config();

const express = require(`express`);
const bodyParser = require("body-parser");

const { format } = require(`./utils/queue`);
const { createServer } = require("./schema");
const { getAdminTeamMembers } = require(`./schema/permissions`);
const { handler: slackRequestHandler } = require(`./utils/slack`);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.get(`/format`, async (req, res) => {
  if (req && req.query && req.query.pr) {
    format(req.query.pr);
    res.send("running");
    return;
  }

  res.send("missing stuff");
});

app.post("/slack", slackRequestHandler);

const graphqlserver = createServer(app);

getAdminTeamMembers();

graphqlserver.listen(process.env.PORT, async () => {});
