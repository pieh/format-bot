const { pubsub, PubSubIDs } = require(`./subscriptions`);
const { SlackTaskState } = require(`../utils/slack`);

const jobQueue = new Map();

exports.newTask = (taskId, task) => {
  console.log("new task", task);
  jobQueue.set(taskId, task);
  pubsub.publish(PubSubIDs.TASK_ADDED, {
    taskAdded: task
  });
};

exports.removeTask = taskId => {
  const task = jobQueue.get(taskId);
  console.log("remove task", task);

  pubsub.publish(PubSubIDs.TASK_REMOVED, {
    taskRemoved: task
  });
  jobQueue.delete(taskId);
};

let uuid = 1;
let currentJob = null;

const finishedJobs = new Set();

const finishCurrentJob = () => {
  if (currentJob) {
    finishedJobs.add(currentJob);
  }
};

exports.newJob = task => {
  finishCurrentJob();
  const job = {
    uuid,
    task,
    // status: `Starting`,
    setStatus: status => {
      job.status = status;
      task.context.slackMessage.setStatus({
        text: status,
        state: SlackTaskState.PROGRESS
      });

      pubsub.publish(PubSubIDs.JOB_CHANGED, {
        jobChanged: job
      });
    }
  };
  job.setStatus(`Starting`);
  currentJob = job;
  pubsub.publish(PubSubIDs.CURRENT_JOB, {
    currentJob: job
  });

  uuid++;

  return job;
};

exports.noNewJobs = () => {
  finishCurrentJob();
  currentJob = null;
  pubsub.publish(PubSubIDs.CURRENT_JOB, {
    currentJob: null
  });
};

exports.jobQueue = jobQueue;

exports.tasksResolver = () => {
  return Array.from(jobQueue.values());
};

exports.jobResolver = () => {
  return currentJob;
};

exports.finishedJobsResolver = () => {
  return Array.from(finishedJobs.values());
};
