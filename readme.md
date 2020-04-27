# Release Bot 2.0

This is a rewrite of the `/lock` Slack slash command (a.k.a "the Release bot"). It has also been built using severless.com along with AWS Lambda functions, but in a way that it's easier to deploy. It has been written using Typescript. Here are some of main differences with the old version:

- The Queue is now based on branch name, instead of user. That means the same user can be multiple times in the queue for different branches. It also means that if someone else releases your branch, the bot will properly identify that and update the queue accordingly.
- The `add` command now accept an optional `position` parameter. Now you can add a branch to the queue in a certain position. A new command `move` has been introduce to move a branch to any position.
- Notifications whenever a PR is merged to master. The old bot only notifies in the Slack channel if the person at the top has changed.
- Multiple Queues. Now, the quques are linked to slack channel, so there can be multiple release queues for different projects. That means, you will need to invoke the commands in the right channel.

## Usage

The new Slack bot accept the following commands:

- `list`: Displays the release queue associated with the channel on which it is invoked. If there are no queues configured for that channel, it shows an error.
- `add ['me' | user] [branch] [position?]`: Adds a user to the queue associated with the current channel. It accepts an optional parameter `position`.
- `register ['me' | user] [githubUsername]`: This stores an association between your github username with your slack user. It is not necessary to register before using the bot, but it improves the experience as you can be mentioned by your slack username, so you will get notifications. As the queues are based on branch name (not users), it is possible to add yourself to the queue without having registered before.

* `remove [branch]`: Removes the branch from the current queue (queue associated with the slack channel the command is invoked from).
* `move [branch] [position]`: Moves the branch to the given position.
* `back [branch]`: Similar to `move`, moves the branch one step back in the queue.
* `create [repo] [slack webhook] [ci url]`: This creates a new queue associated with the current slack channel. You need to provide the github repo full name, a slack webhook and a ci url (more information in the next section).

### Configuring a new Queue

#### Step 1: Github repo webhook

First thing is to configure the Github repo to send events to our bot when a Pull Request changes. This action needs admin permission in the repo. We need to go to Settings > Webhooks and add a new Webhook. "Payload URL" needs to be the full url for the lambda function (`releasebot/github`). "Content Type" needs to be `application/json`. In the section below, we need to select "Let me select individual events" and select the checkbox for "Pull requests" only. Then, the "Active" needs to be checked too.

#### Step 2: Slack webhook

We also need to configure a webhook for slack. This will be used by the bot to send messages to a particular slack channel. It is recommended to configure the webhook so it sends messages to the same channel on which the queue is being configured. For this, we need to go to https://se-tech.slack.com/apps/manage/custom-integrations and select "Incoming webhooks". There we need to select the channel to which we want the bot to send the messages for this queue. We will need to copy the "Webhook URL" as we will need to provide it to the `/create` command. The rest of the fields such as "Customise name", "Customise icon" can be configured as desired.

#### Step 3: Jenkins

When a new branch is at the top of the queue, the bot will automatically trigger a job in Jenkins. The bot will send a post request to a configurable URL. This post request will contain as payload the following properties:

- `BRANCH_TO_MERGE`: the new branch at the top of the queue.
- `NOTIFICATION_ENDPOINT`: A url to which jenkins will send updates to. This will atomatically be the same configured in step 2.

The `content-type` of this request will be `application/x-www-form-urlencoded`.

#### Step 4: `/create` command

Finally, we need to run the `create [repo] [slack webhook] [ci url]` command from the slack channel we want to setup the queue in. The first parameter will be the full name for the github repo (`user-name/repo-name`). The second parameter will be the url from "Step 2". The last parameter, will be the url from "Step 3".

## Development

You will need serverless installed, https://serverless.com/framework/docs/getting-started/. Once it's installed, you will need to clone the repo, then run `npm install` in the root folder.

In order to deploy the project, you will need to configure an AWS account. You can get a temporal set of credentials for our sandbox AWS account. You can see more details here: https://github.com/secretescapes/infrastructure/wiki/AWS#aws-cli-access.

Once you have that, you will need to configure a new set of AWS profile named `release-bot`.

After that, you can simply do `sls deploy`.

## Events

The bot uses different events distributed through different SNS topics. This makes it easier to integrate new functionality that makes use of these events, as any other application can easily subscribe to these SNS topics and consume these events.

### Github Topic

This topic emits events related with github. At the moment, only the "merge" event is emitted.

#### PR Merged

This is emitted when a PR is merged into master.

```
eventType: "MERGE";
pullRequestTitle: string;
pullRequestUrl: string;
branchName: string;
repoName: string;
mergedBy: string;
```

### Queue Topic

This topic will communicate events related with the Queue state. At the moment, there are two events available.

#### QueueChangedEvent

This is emitted every time a queue changes.

```
eventType: "QUEUE_CHANGED";
channel: string;
before: string;
after: string;
```

#### QueueReleaseWindowChanged

This is emmitted when a queue is opened or closed.

```
eventType: "WINDOW_OPEN" | "WINDOW_CLOSED";
channel: string;
```

### CI Topic

This topic broadcasts events coming from the CI system (Jenkins).

#### CI Event

```
eventType:
    | "START"
    | "FAILURE_MERGE"
    | "START_TEST"
    | "FAILURE_TEST"
    | "SUCCESS"
    | "FAILURE_ABNORMAL";
  branch: string;
  url: string;
```
