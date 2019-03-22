"use strict";

import { ResponseManager, CommandEventsManager } from "./Managers";
import { Command, CommandResult } from "./commands/Command";
import { SlackCommandFactory } from "./commands/SlackCommandFactory";
import { GithubCommandFactory } from "./GithubCommandFactory";
import { CommandFactory } from "./CommandFactory";

const REGION = process.env.myRegion || "";
const COMMAND_TOPIC = process.env.commandTopicArn || "";

module.exports.server = async event => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(
    messages.map(getProcessFunction(new SlackCommandFactory()))
  );
  return;
};

module.exports.github = async event => {
  console.log(JSON.stringify(event));
  await getProcessFunction(new GithubCommandFactory())(event.body);
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

function getProcessFunction(
  commandFactory: CommandFactory
): (message: any) => Promise<void> {
  return async (message: any) => {
    console.log(`Processsing Message`);
    const command: Command = await commandFactory.buildCommand(message.body);
    const result: CommandResult = await command.execute();
    if (message.body.response_url) {
      await new ResponseManager().postResponse(
        message.body.response_url,
        result.result
      );
    } else {
      console.log(`Skipping sending response`);
    }
  };
}
