const AWS = require("aws-sdk");
export class EventsManager {
  private sns: any;
  private topic: string;
  constructor(region: string, topic: string) {
    this.sns = new AWS.SNS({ region });
    this.topic = topic;
  }
  protected async publish(message: string) {
    try {
      await this.sns
        .publish({
          Message: message,
          TopicArn: this.topic
        })
        .promise();
      console.info(`message published in ${this.topic}`);
    } catch (err) {
      console.error(err);
      throw new Error("Error publishing event");
    }
  }
}
