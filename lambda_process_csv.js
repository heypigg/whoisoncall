const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const csv = require('csv-parser');

// Initialize S3 and DynamoDB clients with LocalStack endpoint
const s3 = new S3Client({ 
    endpoint: 'http://host.docker.internal:4566', 
    forcePathStyle: true 
});
const dynamodb = new DynamoDBClient({ endpoint: 'http://host.docker.internal:4566' });

const DYNAMO_TABLE_NAME = 'OnCallSchedule';

exports.handler = async (event) => {
    console.log("Event: ", JSON.stringify(event, null, 2));

    const bucketName = event.Records[0].s3.bucket.name;
    const fileName = event.Records[0].s3.object.key;

    console.log(`Bucket Name: ${bucketName}, File Name: ${fileName}`);

    try {
        const getObjectParams = { Bucket: bucketName, Key: fileName };
        const command = new GetObjectCommand(getObjectParams);
        const s3Response = await s3.send(command);

        const s3Stream = s3Response.Body;
        const parsedData = [];

        // Track previous row's Week #, Start, and End to carry forward blank cells
        let lastWeek = null;
        let lastStart = null;
        let lastEnd = null;

        // Parse the CSV data
        await new Promise((resolve, reject) => {
            s3Stream.pipe(csv())
                .on('data', (row) => {
                    // If fields are missing, use the last seen values
                    const weekNumber = row['Week #'] && row['Week #'].trim() !== '' ? row['Week #'] : lastWeek;
                    const startDate = row.Start && row.Start.trim() !== '' ? row.Start : lastStart;
                    const endDate = row.End && row.End.trim() !== '' ? row.End : lastEnd;

                    // Update the last seen values
                    lastWeek = weekNumber;
                    lastStart = startDate;
                    lastEnd = endDate;

                    // Create a composite key by combining NTID, Week #, and CSP
                    const compositeID = `${row.NTID || 'Unknown'}_${weekNumber}_${row.CSP}`;

                    const item = {
                        "ID": { "S": compositeID },  // Composite key to make entries unique
                        "Week #": { "N": weekNumber || '0' },  // Carry over the week number
                        "Start": { "S": startDate || '1970-01-01' },  // Carry over start date
                        "End": { "S": endDate || '1970-01-01' },  // Carry over end date
                        "CSP": { "S": row.CSP },  // String
                        "Engineer": { "S": row.Engineer },  // String
                        "Email": { "S": row.Email },  // String
                        "Mobile": { "S": row.Mobile }  // String
                    };

                    console.log('DynamoDB Item:', JSON.stringify(item, null, 2));

                    parsedData.push(item);
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
        
        console.log('Parsed CSV Data:', JSON.stringify(parsedData, null, 2));

        // Insert parsed data into DynamoDB
        for (const item of parsedData) {
            const putParams = {
                TableName: DYNAMO_TABLE_NAME,
                Item: item
            };

            const putCommand = new PutItemCommand(putParams);
            await dynamodb.send(putCommand);
        }

        console.log(`Successfully processed ${parsedData.length} records and inserted them into DynamoDB.`);
    } catch (error) {
        console.error(`Error processing file: ${error}`);
    }
};
