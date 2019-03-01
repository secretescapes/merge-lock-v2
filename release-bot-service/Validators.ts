import { Queue, ReleaseSlot } from "./Queues";
export class ValidatorResult {
  static OK: ValidatorResult = new ValidatorResult();
  errors: string[];
  constructor(errors?: string[] | string) {
    if (typeof errors === "string") {
      this.errors = [errors];
    } else {
      this.errors = errors || [];
    }
  }

  getErrors(): string[] {
    return this.errors;
  }
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
}
interface Validator {
  validate(queue: Queue, releaseSlot: ReleaseSlot): Promise<ValidatorResult>;
}
export class BranchIsNotInQueueValidator implements Validator {
  async validate(
    queue: Queue,
    releaseSlot: ReleaseSlot
  ): Promise<ValidatorResult> {
    console.log(
      `Checking branch: ${JSON.stringify(queue)} - ${JSON.stringify(
        releaseSlot
      )}`
    );
    return queue
      .getReleaseSlots()
      .map(rl => rl.getBranch())
      .includes(releaseSlot.getBranch())
      ? new ValidatorResult(`Branch is already in the queue`)
      : ValidatorResult.OK;
  }
}

export class BranchHasPrValidator implements Validator {
  async validate(
    queue: Queue,
    releaseSlot: ReleaseSlot
  ): Promise<ValidatorResult> {
    //TODO
    return ValidatorResult.OK;
  }
}

export class CompositeValidator implements Validator {
  validators: Validator[];
  constructor(...validators) {
    this.validators = validators;
  }
  async validate(
    queue: Queue,
    releaseSlot: ReleaseSlot
  ): Promise<ValidatorResult> {
    const results = await Promise.all(
      this.validators.map(v => v.validate(queue, releaseSlot))
    );
    return new ValidatorResult(
      ...results.filter(r => r.hasErrors()).map(r => r.getErrors())
    );
  }
}
