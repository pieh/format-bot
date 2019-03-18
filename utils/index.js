const childProcess = require("child_process");

const sanitzeOutput = out => {
  out.replace(
    new RegExp(process.env.GITHUB_ACCESS_TOKEN, "g"),
    "<GITHUB_ACCESS_TOKEN>"
  );
};

exports.pExec = (command, execArgs = {}, log = command) =>
  new Promise((resolve, reject) => {
    console.log(sanitzeOutput(`$ ${log}`));
    childProcess.exec(command, execArgs, (err, stdout, stderr) => {
      if (stderr) {
        console.log(` - ERR START`);
        console.error(sanitzeOutput(stderr));
        console.log(` - ERR END`);
      }
      console.log(sanitzeOutput(stdout));
      if (err) {
        err.stderr = sanitzeOutput(stderr);
        err.stdout = sanitzeOutput(stdout);
        reject(err);
      }

      resolve({
        stderr,
        stdout
      });
    });
  });
