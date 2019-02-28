import { expect } from "chai";
import "mocha";
import { Queue, ReleaseSlot, ReleaseQueue, SlackUser } from "./Queues";
import { mock } from "ts-mockito";

describe("Queue", () => {
  it("can be created without params", () => {
    const queue = new Queue();
    expect(queue).to.be.not.null;
  });

  it("isEmpty returns true if queue is empty", () => {
    const queue = new Queue();
    expect(queue.isEmpty()).to.be.true;
  });

  it("getReleaseSlots returns empty list if queue is empty", () => {
    const queue = new Queue();
    expect(queue.getReleaseSlots()).to.be.eql([]);
  });

  it("getReleaseSlots returns one slot if one slot is added to queue", async () => {
    const queue = new Queue();
    const item: ReleaseSlot = mock(ReleaseSlot);
    expect((await queue.add(item)).getReleaseSlots()).to.be.eqls([item]);
  });

  it("getReleaseSlots returns all slots added to queue", async () => {
    const queue = new Queue();
    const item1: ReleaseSlot = new ReleaseSlot(mock(SlackUser), "branch1");
    const item2: ReleaseSlot = new ReleaseSlot(mock(SlackUser), "branch2");
    expect(
      (await (await queue.add(item1)).add(item2))
        .getReleaseSlots()
        .map(i => i.getBranch())
    ).to.be.eqls(["branch1", "branch2"]);
  });

  it("isEmpty returns false if queue is not empty", async () => {
    const queue = new Queue();
    const item: ReleaseSlot = mock(ReleaseSlot);
    expect((await queue.add(item)).isEmpty()).to.be.false;
  });

  it("add returns a queue with one element if queue was empty", async () => {
    const queue = new Queue();
    const item: ReleaseSlot = mock(ReleaseSlot);
    expect((await queue.add(item)).getReleaseSlots()).to.be.eql([item]);
  });
});

describe("ReleaseQueue", () => {
  it("can be created with a channel", () => {
    const releaseQueue = new ReleaseQueue("channelName");
    expect(releaseQueue.getChannel()).to.be.equals("channelName");
    expect(releaseQueue.isEmpty()).to.be.true;
  });
});

describe("ReleaseSlot", () => {
  it("can be created with a SlackUser and a branch", () => {
    const slackUser = mock(SlackUser);
    const releaseSlot = new ReleaseSlot(slackUser, "branch");
    expect(releaseSlot.getBranch()).to.be.equals("branch");
    expect(releaseSlot.getUser()).to.be.eqls(slackUser);
  });
});
