const AWS = require("aws-sdk");
export class DynamoDBManager {
  protected tableName: string;
  protected dynamodb: any;
  constructor(tableName: string, region: string) {
    this.tableName = tableName;
    this.dynamodb = new AWS.DynamoDB({ region });
  }
}
