const { PubSub } = require("apollo-server-express");

const PubSubIDs = {
  TASK_ADDED: `TASK_ADDED`,
  TASK_REMOVED: `TASK_REMOVED`,
  JOB_CHANGED: `JOB_CHANGED`,
  CURRENT_JOB: `CURRENT_JOB`
};

const pubsub = new PubSub();

exports.pubsub = pubsub;
exports.PubSubIDs = PubSubIDs;
