const childProcess = require("child_process");

exports.pExec = (command, execArgs = {}, log = command) =>
  new Promise((resolve, reject) => {
    console.log(`$ ${log}`);
    childProcess.exec(command, execArgs, (err, stdout, stderr) => {
      if (stderr) {
        console.log(` - ERR START`);
        console.error(stderr);
        console.log(` - ERR END`);
      }
      console.log(stdout);
      if (err) {
        reject(err);
      }

      resolve();
    });
  });
