const express = require(`express`);
const Octokit = require("@octokit/rest");
const { format } = require(`./format`);
const { addGatsbyDevDeps } = require(`./build`)
require("dotenv").config();

const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_ACCESS_TOKEN}`
});

const init = addGatsbyDevDeps()

const app = express();

app.get(`/format`, async (req, res) => {
  if (req && req.query && req.query.pr) {
    console.log(req.query);

    await init

    format({
      args: req.query,
      octokit
    });
    res.send("running");
    return;
  }

  res.send("missing stuff");
});

app.listen(process.env.PORT, async () => {
  console.log("Server started");
});
