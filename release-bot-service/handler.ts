"use strict";

import { CommandEventsManager } from "./managers/eventsManagers/CommandEventsManager";
import { ResponseManager } from "./managers/ResponseManager";
import { Command, CommandResult } from "./commands/Command";
import { SlackCommandFactory } from "./commands/commandFactories/SlackCommandFactory";
import { GithubCommandFactory } from "./commands/commandFactories/GithubCommandFactory";
import { CommandFactory } from "./commands/commandFactories/CommandFactory";
import { REGION, COMMAND_TOPIC, CI_TOPIC } from "./environment";
import { NotificationCommandFactory } from "./commands/commandFactories/NotificationCommandFactory";
import { CICommandFactory } from "./commands/commandFactories/CICommandFactory";
import { CiEventsManager } from "./managers/eventsManagers/CiEventsManager";
import { CiUpdate } from "./managers/eventsManagers/Events";

module.exports.server = async event => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(
    record => JSON.parse(record.Sns.Message).body
  );
  await Promise.all(
    messages.map(getProcessFunction(new SlackCommandFactory()))
  );
  return;
};

module.exports.github = async event => {
  console.log(JSON.stringify(event));
  await getProcessFunction(new GithubCommandFactory())(event.body.body);
  return;
};

module.exports.dispatcher = async event => {
  console.log(JSON.stringify(event));
  try {
    await new CommandEventsManager(REGION, COMMAND_TOPIC).publishEvent(
      JSON.stringify(event)
    );
  } catch (err) {
    return { text: "Something went wrong" };
  }
  return { text: "OK" };
};

module.exports.slackNotifications = async event => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(
    messages.map(getProcessFunction(new NotificationCommandFactory()))
  );
  return;
};

module.exports.jenkinsTrigger = async event => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(messages.map(getProcessFunction(new CICommandFactory())));
  return;
};

module.exports.ciStatusUpdate = async event => {
  console.log(JSON.stringify(event));
  const ciUpdate = event.body;
  if (!CiUpdate.isCiUpdate(ciUpdate)) {
    console.error(`Unkown event received from CI: ${JSON.stringify(ciUpdate)}`);
    return;
  }
  console.log(`Sending notification to CI topic...`);
  await new CiEventsManager().publishEvent({
    eventType: ciUpdate.state,
    branch: ciUpdate.branch,
    url: ciUpdate.url
  });
  console.log(`Notification sent`);
  return;
};

function getProcessFunction(
  commandFactory: CommandFactory
): (message: any) => Promise<void> {
  return async (message: any) => {
    console.log(`Processsing Message ${JSON.stringify(message)}`);
    const command: Command = await commandFactory.buildCommand(message);
    const result: CommandResult = await command.execute();
    if (message.response_url) {
      await new ResponseManager().postResponse(
        message.response_url,
        result.result
      );
    } else {
      console.log(`Skipping sending response`);
    }
  };
}
