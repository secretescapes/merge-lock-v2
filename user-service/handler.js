"use strict";
const AWS = require("aws-sdk");

module.exports.register = async (event, context, callback) => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(messages.map(processMessage));
  return;
};

async function processMessage(message) {
  const slackUsername = message.slack_user;
  const githubUsername = message.githubUsername;
  const tableName = process.env.dynamoDBUserTableName;

  let dynamoDBOpts = {
    region: process.env.myRegion
  };
  let dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  var params = prepareItem(slackUsername, githubUsername, tableName);

  try {
    console.log(`Storing item: ${JSON.stringify(params)}`);
    await dynamodb.putItem(params).promise();
    console.log(`Item stored`);
    //TODO: Send message with error/success
  } catch (err) {
    console.error(`Error storing to dynamodb: ${err}`);
  }
}

function prepareItem(slackUsername, githubUsername, tableName) {
  return {
    Item: {
      username: {
        S: `<@${slackUsername.user_id}|${slackUsername.username}>`
      },
      githubUsername: {
        S: githubUsername
      }
    },
    TableName: `${tableName}`
  };
}
