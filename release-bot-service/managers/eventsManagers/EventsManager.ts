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
      console.info(`Trying to publish message in ${this.topic}`);
      await this.sns
        .publish({
          Message: message,
          TopicArn: this.topic
        })
        .promise();
      console.info(`Message published`);
    } catch (err) {
      console.error(err);
      throw new Error("Error publishing event");
    }
  }
}
