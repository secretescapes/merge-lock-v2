"use strict";
const axios = require("axios");

module.exports.notify = async (event, context) => {
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
