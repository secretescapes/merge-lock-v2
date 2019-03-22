import { SlackUser } from "../../Queues";
import { DynamoDBManager } from "./DynamoDBManager";
export class DynamoDBUserManager extends DynamoDBManager {
  async updateUser(slackUser: SlackUser, githubUsername) {
    try {
      await this.dynamodb
        .putItem({
          Item: {
            username: {
              S: slackUser.toString()
            },
            githubUsername: {
              S: githubUsername
            }
          },
          TableName: `${this.tableName}`
        })
        .promise();
    } catch (err) {
      console.error(`Error storing to dynamodb: ${err}`);
      throw err;
    }
  }
}
