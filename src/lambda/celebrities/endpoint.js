const DynamodbClient = require('aws-sdk/clients/dynamodb');

const dynamodb = new DynamodbClient.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    console.log(`Trying to process the event: ${JSON.stringify(event)}`)

    const results = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: {
            id: event.pathParameters.id,
        },
    }).promise();

    console.log(`Received item: ${JSON.stringify(results.Item)}`);

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(results.Item)
    };
};
