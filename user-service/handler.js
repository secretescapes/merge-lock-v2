"use strict";
const AWS = require("aws-sdk");

module.exports.register = async (event, context, callback) => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await processMessage(messages[0]);
  // messages.forEach(message => await processMessage(message, callback));

  return;
  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

async function processMessage(message) {
  const slackUsername = message.slack_user;
  const githubUsername = message.githubUsername;
  const tableName = process.env.dynamoDBUserTableName;

  let dynamoDBOpts = {
    region: process.env.myRegion
  };
  let dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  var params = {
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

  try {
    console.log(`About to store: ${JSON.stringify(params)}`);
    const a = await dynamodb.putItem(params).promise();
    console.log(JSON.stringify(a));
    console.log(`Stored!`);
  } catch (err) {
    console.error(`Error storing to dynamodb: ${err}`);
  }
  console.log("AFTER");
}
