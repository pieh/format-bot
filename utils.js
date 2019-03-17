const childProcess = require("child_process");

exports.pExec = (command, execArgs = {}, log = command) =>
  new Promise((resolve, reject) => {
    console.log(`$ ${log}`);
    childProcess.exec(command, execArgs, (err, stdout, stderr) => {
      console.error(stderr);
      console.log(stdout);
      if (err) {
        reject(err);
      }

      resolve();
    });
  });

exports.owner = "pieh";
exports.repo = "gatsby";
