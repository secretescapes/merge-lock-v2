import { QUEUES_TABLE_NAME, REGION } from "../../environment";

const AWS = require("aws-sdk");
export class DynamoDBManager {
  protected tableName: string;
  protected dynamodb: any;
  constructor() {
    this.tableName = QUEUES_TABLE_NAME;
    this.dynamodb = new AWS.DynamoDB({ REGION });
  }
}
