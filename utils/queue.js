const BetterQueue = require(`better-queue`);
const { init } = require(`./init`);
const {
  jobQueue,
  newTask,
  removeTask,
  newJob,
  noNewJobs
} = require(`../schema/jobs`);
const { createSlackTracker, SlackTaskState, setTasks } = require(`./slack`);

const getTaskID = task => `${task.type}-${JSON.stringify(task.args)}`;

const queue = new BetterQueue(
  async (task, cb) => {
    const handler = require(`../tasks/${task.type}`);

    const job = newJob(task);

    // setTimeout(() => {
    //   cb();
    // }, 15000);

    try {
      await handler(task.args, job);
      job.setStatus(`Finished`, SlackTaskState.FINISHED);
      cb();
    } catch (e) {
      console.log(e)
      job.setStatus(`Error`, SlackTaskState.ERROR);
      cb(e);
    }
  },
  {
    concurrent: 1,
    id: (task, cb) => {
      cb(null, getTaskID(task));
    },
    merge: (oldTask, newTask, cb) => {
      cb(null, oldTask);
    },
    filter: (task, cb) => {
      const taskID = getTaskID(task);
      const isInQueue = jobQueue.has(taskID);
      cb(isInQueue ? `not_allowed` : null, { taskID, ...task });
    }
  }
);

queue.on("task_accepted", (taskID, task) => {
  newTask(taskID, task);
  // console.log("task_accepted", task);
  // emit new job in queue
});

queue.on("task_started", (taskID, task) => {
  removeTask(taskID);
  // console.log("task_started", task);
});

// queue.on("task_finish", (taskID, task) => {
//   // jobQueue.delete(taskID);
//   // console.log("task_finish", task);
// });

// queue.on("task_failed", (taskID, task) => {
//   // jobQueue.delete(taskID);
//   // console.log("task_failed", task);
// });

queue.on("drain", () => {
  noNewJobs();
});

queue.pause();

init().then(() => {
  queue.resume();
});

const format = async (pr, mergeMaster = false) => {
  const slackMessage = await createSlackTracker({
    text: `${
      mergeMaster ? `Merge upstream/master and format` : `Format`
    } PR - <https://github.com/gatsbyjs/gatsby/pull/${pr}|#${pr}>`,
    status: {
      text: `Queued`,
      state: SlackTaskState.QUEUED
    }
  });
  queue.push({
    type: "format",
    args: { pr, mergeMaster },
    context: {
      slackMessage
    }
  });
};

exports.format = format;

setTasks({ format });
