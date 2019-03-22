export const REGION = process.env.myRegion || "";
export const GITHUB_TOPIC = process.env.githubTopicArn || "";
export const QUEUES_TABLE_NAME = process.env.dynamoDBQueueTableName || "";
export const USERS_TABLE_NAME = process.env.dynamoDBUserTableName || "";
export const COMMAND_TOPIC = process.env.commandTopicArn || "";
export const QUEUE_TOPIC = process.env.queueTopicArn || "";
export const SLACK_INCOMING_WEBHOOK_URL =
  process.env.slackIncomingWebhookUrl || "";
