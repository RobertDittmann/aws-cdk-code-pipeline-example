const path = require('path');
const S3Client = require('aws-sdk/clients/s3');
const RekognitionClient = require('aws-sdk/clients/rekognition');
const DynamodbClient = require('aws-sdk/clients/dynamodb');

const s3 = new S3Client();
const rekognition = new RekognitionClient();
const dynamodb = new DynamodbClient.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    for (const image of event.Records) {
        console.log(`Trying to process the image: ${JSON.stringify(image)}`);
        const bucket = image.s3.bucket.name;
        const key = image.s3.object.key;

        try {
            const rawImage = await getImage(bucket, key);
            const celebrityMetadata = await getCelebrityMetadata(rawImage);
            await saveMetadata(key, celebrityMetadata);

            console.log(`Successfully saved metadata for ${key} image`);
        } catch (err) {
            console.log(`Failed to save the metadata for ${key} image. Error: ${err}`);
            throw err;
        }
    }
};

const getImage = async (bucket, key) => {
    console.log('Trying to download the image');
    const image = await s3.getObject({
        Bucket: bucket,
        Key: key,
    }).promise();
    return image.Body;
};

const getCelebrityMetadata = async (image) => {
    console.log('Trying to recognize the celebrity on the image');
    const params = {
        Image: {
            Bytes: image,
        },
    };

    const results = await rekognition.recognizeCelebrities(params).promise();
    return results.CelebrityFaces;
};

const saveMetadata = async (key, metadata) => {
    console.log('Trying to save the metadata to database');
    const fileName = path.parse(key).name;
    return dynamodb.put({
        TableName: TABLE_NAME,
        Item: {
            id: fileName,
            metadata: metadata,
        },
    }).promise();
};
