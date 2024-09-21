const AWS = require('aws-sdk');

// Configure the S3 client to use the LocalStack endpoint
const s3 = new AWS.S3({
    endpoint: 'http://host.docker.internal:4566',
    s3ForcePathStyle: true, // Needed for LocalStack
});

const dynamodb = new AWS.DynamoDB.DocumentClient({ endpoint: 'http://host.docker.internal:4566' });
const csv = require('csv-parser');

// Replace this with your DynamoDB table name
const DYNAMO_TABLE_NAME = 'OnCallSchedule';

exports.handler = async (event) => {
    console.log("Event: ", JSON.stringify(event, null, 2)); // Log the entire event
    const bucketName = event.Records[0].s3.bucket.name; // Correctly defined in the handler
    const fileName = event.Records[0].s3.object.key;

    console.log(`Bucket Name: ${bucketName}`); // Log the bucket name

    const params = {
        Bucket: bucketName,
        Key: fileName
    };

    try {
        const s3Stream = s3.getObject(params).createReadStream();
        const parsedData = [];

        // Parse the CSV data
        await new Promise((resolve, reject) => {
            s3Stream.pipe(csv())
                .on('data', (row) => {
                    // Push each row of the CSV into the parsedData array
                    parsedData.push(row);
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (error) => {
                    reject(error);
                });
        });

        // Insert parsed data into DynamoDB
        for (const item of parsedData) {
            const dynamoParams = {
                TableName: DYNAMO_TABLE_NAME,
                Item: item
            };

            await dynamodb.put(dynamoParams).promise();
        }

        console.log(`Successfully processed ${parsedData.length} records and inserted them into DynamoDB.`);
    } catch (error) {
        console.error(`Error processing file: ${error}`);
    }
};