const Slack = require("slack");
const yargs = require(`yargs`);

const slack = new Slack({ token: process.env.SLACK_ACCESS_TOKEN });

exports.slack = slack;

// const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

// hardcoded channel on pieh's slack playground workspace
// `GH5A19D4Y`
const channel = process.env.SLACK_CHANNEL_ID;

const SlackTaskState = {
  QUEUED: `#439FE0`,
  PROGRESS: `warning`,
  FINISHED: `good`,
  ERROR: `danger`
};

let tasks = {};

exports.setTasks = _tasks => (tasks = _tasks);

exports.SlackTaskState = SlackTaskState;

const createAttachment = status => {
  if (!status) {
    return [];
  }

  return [
    {
      color: status.state,
      text: status.text
    }
  ];
};

const createSlackTracker = async ({ text, status }) => {
  let attachments = createAttachment(status);
  const result = await slack.chat.postMessage({
    channel,
    text,
    attachments
  });

  return {
    setStatus: async status => {
      console.log("updating slack status", status);
      attachments = createAttachment(status);
      await slack.chat.update({
        channel,
        text,
        attachments,
        ts: result.ts
      });
    },
    updateText: async _text => {
      text = _text;
      await slack.chat.update({
        channel,
        text,
        attachments,
        ts: result.ts
      });
    },
    getText: () => text
  };
};

exports.createSlackTracker = createSlackTracker;

const parseCommand = (cmd, context) => {
  const messageJustTheUser = async obj => {
    await slack.chat.postEphemeral({
      channel: context.channel_id,
      user: context.user_id,
      ...obj
    });
  };

  const prNumberOptionBuilder = yargs =>
    yargs
      .option("pr-number", {
        requiresArg: true,
        demandOption: true,
        desc: "PR number"
      })
      .check(args => {
        if (isNaN(args.prNumber)) {
          throw `PR number must be ... a number - \`${
            args.prNumber
          }\` is not a number.`;
        }
        return true;
      });

  const argsHandler = yargs
    .reset()
    .command({
      command: `format <pr-number>`,
      desc: `Format PR`,
      builder: prNumberOptionBuilder,
      handler: async args => {
        tasks.format(args.prNumber, false);

        return false;
      }
    })
    .command({
      command: `merge-master <pr-number>`,
      desc: `Merge master into PR branch`,
      builder: prNumberOptionBuilder,
      handler: async args => {
        tasks.format(args.prNumber, true);

        return false;
      }
    })
    .scriptName(`/oss`)
    .demandCommand(
      1,
      `Use "/oss --help" to see all available commands and options.`
    )
    .help(true)
    .version(false)
    .showHelpOnFail(true)
    .recommendCommands()
    .strict()
    .wrap(120)
    .parse(cmd, async (err, argv, output) => {
      if (output) {
        let outputText = `\`\`\`\n${output}\n\`\`\``;
        if (err) {
          outputText =
            `Command \`/oss${cmd ? ` ${cmd}` : ``}\` failed.\n` + outputText;
        }
        await messageJustTheUser({
          text: outputText
        });
      }
    });
};
exports.handler = (req, res) => {
  res.send(200, "");
  parseCommand(req.body.text, req.body);
};
