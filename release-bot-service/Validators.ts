import { Queue, ReleaseSlot } from "./Queues";

class SimpleResult {
  fail: boolean;
  reason?: string;
  static OK: SimpleResult = new SimpleResult(false);

  constructor(fail: boolean, reason?: string) {
    this.fail = fail;
    this.reason = reason;
  }

  isFail(): boolean {
    return this.fail;
  }
  getReason(): string {
    return this.reason || "";
  }
}

export class CompositeResult {
  errors: string[];
  constructor(errors?: string[]) {
    this.errors = errors || [];
  }

  getErrors(): string[] {
    return this.errors;
  }
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
}
interface Validator {
  validate(queue: Queue, releaseSlot: ReleaseSlot): Promise<CompositeResult>;
}

interface SimpleValidator {
  validate(queue: Queue, releaseSlot: ReleaseSlot): Promise<SimpleResult>;
}
export class BranchIsNotInQueueValidator implements SimpleValidator {
  async validate(
    queue: Queue,
    releaseSlot: ReleaseSlot
  ): Promise<SimpleResult> {
    console.log(
      `Checking branch: ${JSON.stringify(queue)} - ${JSON.stringify(
        releaseSlot
      )}`
    );
    return queue
      .getReleaseSlots()
      .map(rl => rl.getBranch())
      .includes(releaseSlot.getBranch())
      ? new SimpleResult(true, `Branch is already in the queue`)
      : SimpleResult.OK;
  }
}

export class BranchHasPrValidator implements SimpleValidator {
  async validate(
    queue: Queue,
    releaseSlot: ReleaseSlot
  ): Promise<SimpleResult> {
    //TODO
    return SimpleResult.OK;
  }
}

export class CompositeValidator implements Validator {
  validators: SimpleValidator[];
  constructor(...validators) {
    this.validators = validators;
  }
  async validate(
    queue: Queue,
    releaseSlot: ReleaseSlot
  ): Promise<CompositeResult> {
    console.log(`VALIDATE`);
    const results = await Promise.all(
      this.validators.map(v => v.validate(queue, releaseSlot))
    );
    console.log(`RESULT: ${JSON.stringify(results)}`);
    return new CompositeResult(
      results.filter(r => r.isFail()).map(r => r.getReason())
    );
  }
}
