const express = require(`express`);
const Octokit = require("@octokit/rest");
const { format } = require(`./format`);
require("dotenv").config();

const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_ACCESS_TOKEN}`
});

const app = express();

app.get(`/format`, (req, res) => {
  if (req && req.query && req.query.pr) {
    console.log(req.query);
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
