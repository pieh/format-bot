const express = require(`express`);
const Octokit = require("@octokit/rest");
const { format } = require(`./format`);
const { addGatsbyDevDeps } = require(`./build`);
const npmWhich = require("npm-which")(process.cwd());
const parse = require("string-argv");

require("dotenv").config();

const octokit = new Octokit({
  auth: `token ${process.env.GITHUB_ACCESS_TOKEN}`
});

const binCache = new Map();

const findBin = cmd => {
  const [binName, ...args] = parse(cmd);

  if (binCache.has(binName)) {
    return { bin: binCache.get(binName), args };
  }

  /* npm-which tries to resolve the bin in local node_modules/.bin */
  /* and if this fails it look in $PATH */
  const bin = npmWhich.sync(binName);

  binCache.set(binName, bin);
  return { bin, args };
};

let lintStagedConf = null;
const init = addGatsbyDevDeps().then(l => {
  lintStagedConf = Object.entries(l).reduce((acc, [selector, commands]) => {
    acc[selector] = commands.map(findBin);
    return acc;
  }, {});
  return lintStagedConf;
});

const app = express();

app.get(`/format`, async (req, res) => {
  if (req && req.query && req.query.pr) {
    console.log(req.query);

    await init;

    format({
      args: req.query,
      octokit,
      lintStagedConf
    });
    res.send("running");
    return;
  }

  res.send("missing stuff");
});

app.listen(process.env.PORT, async () => {
  console.log("Server started");
});
