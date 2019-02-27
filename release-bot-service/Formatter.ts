import { ReleaseQueue, SlackUser } from "./ReleaseQueue";
interface Formatter<T> {
  format(obj: T): string;
}

class SlackUserFormatter implements Formatter<SlackUser> {
  format(obj: SlackUser): string {
    return `<@${obj.user_id}|${obj.username}>`;
  }
}

export class SlackFormatter implements Formatter<ReleaseQueue> {
  private userFormatter: SlackUserFormatter;

  constructor() {
    this.userFormatter = new SlackUserFormatter();
  }

  format(releaseQueue: ReleaseQueue): string {
    console.log(`About to format: ${JSON.stringify(releaseQueue)}`);

    try {
      return (
        releaseQueue
          .getReleaseSlots()
          .map(
            item =>
              `${this.userFormatter.format(
                item.getUser()
              )} *${item.getBranch()}*`
          )
          .reduce(
            (accumulator, currentValue, currentIndex) =>
              `${accumulator}${currentIndex === 0 ? "" : "\n"}${currentIndex +
                1}.- ${currentValue}`,
            ""
          ) || "The queue is currently empty"
      );
    } catch (err) {
      console.log(`Error formatting queue: ${err}`);
    }

    return `Error :(`;
  }
}
