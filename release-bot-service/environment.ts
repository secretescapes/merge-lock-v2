export const REGION = process.env.myRegion || "";
export const GITHUB_TOPIC = process.env.githubTopicArn || "";
export const QUEUES_TABLE_NAME = process.env.dynamoDBQueueTableName || "";
export const USERS_TABLE_NAME = process.env.dynamoDBUserTableName || "";
export const COMMAND_TOPIC = process.env.commandTopicArn || "";
export const QUEUE_TOPIC = process.env.queueTopicArn || "";
export const CI_STATUS_UPDATE_URL: string = process.env.ciStatusUpdateUrl || "";
export const CI_TOPIC: string = process.env.ciTopicArn || "";
