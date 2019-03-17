const { gql, ApolloServer } = require("apollo-server-express");
const fs = require(`fs-extra`);
const http = require(`http`);

const { pubsub, PubSubIDs } = require(`./subscriptions`);
const { getPrListWithStatuses } = require(`./prs`);
const { getPermissions } = require(`./permissions`);
const typeDefs = gql(fs.readFileSync(`schema/types.graphql`, `utf-8`));
const { getUserInfo } = require(`../utils/auth`);
const { tasksResolver, jobResolver, finishedJobsResolver } = require(`./jobs`);
const { format } = require(`../utils/queue`);

const resolvers = {
  Query: {
    pullRequests: async () => await getPrListWithStatuses(),
    permissions: async (source, args, ctx, info) =>
      await getPermissions(ctx.user),
    tasks: tasksResolver,
    job: jobResolver,
    finishedJobs: finishedJobsResolver
  },
  Subscription: {
    taskAdded: {
      subscribe: () => pubsub.asyncIterator([PubSubIDs.TASK_ADDED])
    },
    taskRemoved: {
      subscribe: () => pubsub.asyncIterator([PubSubIDs.TASK_REMOVED])
    },
    jobChanged: {
      subscribe: () => pubsub.asyncIterator([PubSubIDs.JOB_CHANGED])
    },
    currentJob: {
      subscribe: () => pubsub.asyncIterator([PubSubIDs.CURRENT_JOB])
    }
  },
  Mutation: {
    format: (_, args) => {
      format(args.pr);
      return true;
    }
  }
};

exports.createServer = app => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      // get the user token from the headers
      let user = null;

      const accessToken = (req && req.headers.authorization) || "";
      if (accessToken) {
        try {
          user = await getUserInfo(accessToken);
        } catch (e) {}
      }
      // add the user to the context
      return { user };
    }
  });

  server.applyMiddleware({ app });
  const httpServer = http.createServer(app);
  server.installSubscriptionHandlers(httpServer);

  console.log(
    `🚀 Server ready at http://localhost:${process.env.PORT}${
      server.graphqlPath
    }`
  );
  console.log(
    `🚀 Subscriptions ready at ws://localhost:${process.env.PORT}${
      server.subscriptionsPath
    }`
  );

  return httpServer;
};
