"use strict";
const axios = require("axios");

module.exports.response = async (event, context) => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(messages.map(processMessage));
  return;
};

async function processMessage(message) {
  const text = findResponseText(message);
  const responseUrl = message.response_url;
  await postNotification(responseUrl, text);
}

function findResponseText(message) {
  switch (message.notificationType) {
    case "REGISTER_SUCCESS":
      return `Hey <@${message.slack_user.user_id}|${
        message.slack_user.username
      }>, you have been registered with github username ${
        message.githubUsername
      } :wink:`;
    case "LIST_SUCCESS":
      return `Ok, here is the queue for ${formatSlackChannel(
        message.channel_id,
        message.channel_name
      )}\n${formatQueue(message.queueJsonString)}`;
    case "LIST_ERROR":
      return `Sorry, I couldn't find any queue for ${formatSlackChannel(
        message.channel_id,
        message.channel_name
      )}, please make sure you ask from the correct channel`;
    default:
      return "Well...I don't know what to say...";
  }
}

async function postNotification(url, text) {
  try {
    await axios.post(url, { text });
    console.info("Response sent");
  } catch (error) {
    console.error(error);
  }
}

const formatSlackChannel = (channelId, channelName) =>
  `<#${channelId}|${channelName}>`;
const formatSlackUser = slackUser =>
  `<@${slackUser.user_id}|${slackUser.username}>`;

function formatQueue(queueJsonString) {
  console.log(`FORMATTING QUEUE: ${queueJsonString}`);
  return JSON.parse(queueJsonString)
    .queue.map(entry => `${formatSlackUser(entry.user)} *${entry.branch}*`)
    .reduce(
      (accumulator, currentValue, currentIndex) =>
        `${accumulator}${currentIndex === 0 ? "" : "\n"}${currentIndex +
          1}.- ${currentValue}`,
      ""
    );
}
