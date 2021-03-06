const npmWhich = require("npm-which")(process.cwd());
const parse = require("string-argv");

const { addGatsbyDevDeps } = require(`./build`);

const binCache = new Map();

const findBin = (cmd) => {
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
const init = () =>
  addGatsbyDevDeps().then((l) => {
    lintStagedConf = Object.entries(l).reduce((acc, [selector, commands]) => {
      try {
        if (!Array.isArray(commands)) {
          commands = [commands];
        }
        if (!commands.includes(`git add`)) {
          commands.push(`git add`);
        }
        acc[selector] = commands.map(findBin);
      } catch (e) {
        console.log(e);
      }
      return acc;
    }, {});

    console.log(`init`, {
      raw: l,
      processed: lintStagedConf,
    });

    return lintStagedConf;
  });

exports.getLintStagedConf = init;
exports.init = init;
