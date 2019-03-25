const Slack = require("slack");
const yargs = require(`yargs`);

const slack = new Slack({ token: process.env.SLACK_ACCESS_TOKEN });

exports.slack = slack;

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

// hardcoded channel on pieh's slack playground workspace
const channel = `GH5A19D4Y`;

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

const parseCommand = (cmd, context) =>
  yargs
    .command({
      command: `format [ref]`,
      desc: `Format PR or master branch`,
      handler: async args => {
        let url = null;
        if (args.ref === `master`) {
          url = `https://github.com/gatsbyjs/gatsby`;
          await slack.chat.postEphemeral({
            channel,
            text: `Not supported yet`,
            user: context.user_id
          });
        } else if (!isNaN(args.ref)) {
          url = `https://github.com/gatsbyjs/gatsby/pull/${args.ref}`;
          tasks.format(args.ref);
        } else {
          await slack.chat.postEphemeral({
            channel,
            text: `Not recognized argument to format function. Must be PR number or "master"`,
            user: context.user_id
          });
          return false;
        }

        // try {
        //   const result = await slack.chat.postMessage({
        //     channel,
        //     text: `Format ${url}`,
        //     attachments: [
        //       {
        //         color: "#439FE0",
        //         text: "Queued"
        //       }
        //     ]
        //   });
        //   await sleep(2000);

        //   await slack.chat.update({
        //     channel,
        //     text: `Format ${url}`,
        //     attachments: [
        //       {
        //         color: "warning",
        //         text: "Cloning"
        //       }
        //     ],
        //     ts: result.ts
        //   });

        //   await sleep(2000);

        //   await slack.chat.update({
        //     channel,
        //     text: `Format ${url}`,
        //     attachments: [
        //       {
        //         color: "good",
        //         text: "Cloned"
        //       },
        //       {
        //         color: "warning",
        //         text: "Formatting"
        //       }
        //     ],
        //     ts: result.ts
        //   });

        //   await sleep(2000);

        //   await slack.chat.update({
        //     channel,
        //     text: `Format ${url}`,
        //     attachments: [
        //       {
        //         color: "good",
        //         text: "Cloned"
        //       },
        //       {
        //         color: "good",
        //         text: "Formatted"
        //       },
        //       {
        //         color: "warning",
        //         text: "Pushing"
        //       }
        //     ],
        //     ts: result.ts
        //   });

        //   await sleep(2000);

        //   await slack.chat.update({
        //     channel,
        //     text: `Format ${url} - Done`,
        //     attachments: [],
        //     ts: result.ts
        //   });
        // } catch (e) {
        //   console.log(e);
        // }
        return false;
      }
    })
    .parse(cmd);

exports.handler = (req, res) => {
  res.send(200, "");
  parseCommand(req.body.text, req.body);
};
