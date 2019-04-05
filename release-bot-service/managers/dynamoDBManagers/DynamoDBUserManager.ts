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

  async getSlackUserByGithubUsername(
    githubUsername: string
  ): Promise<SlackUser | null> {
    console.log(`Searching user by github username ${githubUsername}`);
    try {
      const response = await this.dynamodb
        .scan({
          ExpressionAttributeValues: {
            ":githubUsername": {
              S: githubUsername
            }
          },
          FilterExpression: "githubUsername = :githubUsername",
          TableName: this.tableName
        })
        .promise();
      if (response.Items.length > 0) {
        return SlackUser.parseFromString(response.Items[0].username.S);
      }
    } catch (err) {
      console.error(`Error scanning user DB: ${err}`);
    }

    return null;
  }
}
