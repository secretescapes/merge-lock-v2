import * as moment from "moment-timezone";

type ReleaseWindowDefinition = {
  timezone: string;
  // Sunday: 0 Saturday: 6
  day: {
    start: number;
    end: number;
  };
  // 0 - 23
  hour: {
    start: number;
    end: number;
  };
};

const DEFAULT_RELEASE_WINDOW_DEF: ReleaseWindowDefinition = {
  timezone: "Europe/London",
  day: {
    start: 1, // Monday
    end: 4 //Thursday
  },
  hour: {
    start: 9,
    end: 16
  }
};
export class ReleaseWindow {
  private definition: ReleaseWindowDefinition;
  constructor(
    definition: ReleaseWindowDefinition = DEFAULT_RELEASE_WINDOW_DEF
  ) {
    this.definition = definition;
  }

  isReleaseWindowOpen(): boolean {
    const now = moment().tz(this.definition.timezone);
    console.log(
      `Checking release window open Day: ${now.day()} Hour: ${now.hour()}`
    );
    if (
      now.day() >= this.definition.day.start &&
      now.day() <= this.definition.day.end
    ) {
      if (
        now.hour() >= this.definition.hour.start &&
        now.hour() <= this.definition.hour.end
      ) {
        return true;
      }
    }
    return false;
  }

  isReleaseWindowOpening(): boolean {
    const now = moment().tz(this.definition.timezone);
    console.log(
      `Checking release window is opening now: Day: ${now.day()} Hour: ${now.hour()}`
    );
    return (
      now.day() >= this.definition.day.start &&
      now.day() <= this.definition.day.end &&
      now.hour() == this.definition.hour.start
    );
  }
  isReleaseWindowClosing(): boolean {
    const now = moment().tz(this.definition.timezone);
    console.log(
      `Checking release window is closing now: Day: ${now.day()} Hour: ${now.hour()}`
    );
    return (
      now.day() >= this.definition.day.start &&
      now.day() <= this.definition.day.end &&
      now.hour() == this.definition.hour.end
    );
  }
  static getDefaultReleaseWindow(): ReleaseWindow {
    return new ReleaseWindow();
  }
}
