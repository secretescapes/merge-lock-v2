"use strict";
const AWS = require("aws-sdk");
const uuidv1 = require("uuid/v1");
const REGION = process.env.myRegion;
const TABLE = process.env.dynamoDBResponsesTableName;

module.exports.getResponses = async event => {
  console.log(`${JSON.stringify(event)}`);
  const body = event.body;
  const id = event.query.id;
  if (!body || !id) {
    console.error(`Missing body or id`);
    return {
      statusCode: 400
    };
  }

  return await processResponse("GET", JSON.stringify(body), id);
};

module.exports.postResponses = async event => {
  console.log(`${JSON.stringify(event)}`);
  const body = event.body;
  const id = event.query.id;
  if (!body || !id) {
    console.error(`Missing body or id`);
    return {
      statusCode: 400
    };
  }
  return await processResponse("POST", JSON.stringify(body), id);
};

module.exports.retrieveResponses = async event => {
  console.log(`${JSON.stringify(event)}`);
  const id = event.path.id;
  if (!id) {
    console.error(`Missing id`);
    return {
      statusCode: 400
    };
  }

  const responses = await retrieveResponses(id);
  const keys = responses.map(response => ({
    id: response.id,
    uuid: response.uuid
  }));
  await removeResponses(keys);

  return {
    statusCode: 200,
    body: JSON.stringify(responses)
  };
};

async function processResponse(method, body, id) {
  try {
    await storeResponse(method, body, id);
    return {
      statusCode: 200
    };
  } catch (err) {
    console.error(`Error storing response: ${err}`);
    return {
      statusCode: 500
    };
  }
}

async function retrieveResponses(id) {
  try {
    const response = await new AWS.DynamoDB({ REGION })
      .query({
        ExpressionAttributeValues: {
          ":id": {
            S: id
          }
        },
        KeyConditionExpression: "id = :id",
        TableName: `${TABLE}`
      })
      .promise();
    if (response.Items.length > 0) {
      console.log(`Found items: ${JSON.stringify(response.Items)}`);
      return flatten(response.Items);
    } else {
      console.log(`Responses not found`);
      return [];
    }
  } catch (err) {
    console.error(`Error retrieving responses for id ${id}: ${err}`);
    throw err;
  }
}

async function storeResponse(method, body, id) {
  console.log(`Storing response with id ${id} and body [${body}]`);
  try {
    await new AWS.DynamoDB({ REGION })
      .putItem({
        Item: {
          uuid: {
            S: `${uuidv1()}`
          },
          id: {
            S: id
          },
          body: {
            S: body
          },
          method: {
            S: method
          }
        },
        TableName: `${TABLE}`
      })
      .promise();
  } catch (err) {
    console.error(`Error storing response: ${err}`);
    throw err;
  }
}

async function removeResponses(responseKeys) {
  await responseKeys.forEach(async responseKey => {
    try {
      await removeResponse(responseKey.id, responseKey.uuid);
    } catch (err) {
      console.error(`${err}`);
    }
  });
}

async function removeResponse(id, uuid) {
  try {
    await new AWS.DynamoDB({ REGION })
      .deleteItem({
        Key: {
          id: {
            S: id
          },
          uuid: {
            S: uuid
          }
        },
        TableName: `${TABLE}`
      })
      .promise();
  } catch (err) {
    console.error(`Error deleting responses`);
    throw err;
  }
}

function flatten(o) {
  // https://stackoverflow.com/questions/51460982/what-is-the-recommended-way-to-remove-data-type-descriptors-from-a-dynamodb-resp
  // flattens single property objects that have descriptors
  var descriptors = ["L", "M", "N", "S"];
  for (let d of descriptors) {
    if (o.hasOwnProperty(d)) {
      return o[d];
    }
  }

  Object.keys(o).forEach(k => {
    for (let d of descriptors) {
      if (o[k].hasOwnProperty(d)) {
        o[k] = o[k][d];
      }
    }
    if (Array.isArray(o[k])) {
      o[k] = o[k].map(e => flatten(e));
    } else if (typeof o[k] === "object") {
      o[k] = flatten(o[k]);
    }
  });

  return o;
}
