const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');  // AWS SDK v3
const app = express();
const port = 3001;

// DynamoDB client configuration for LocalStack
const dynamodb = new DynamoDBClient({
    endpoint: 'http://localhost:4566',  // LocalStack endpoint
    region: 'us-east-1'  // Default region
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define the root route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function to get today's date in YYYY-MM-DD format
function getCurrentDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Helper function to check if a date is within a range
function isDateWithinRange(targetDate, startDate, endDate) {
    const target = new Date(targetDate);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return target >= start && target <= end;
}

// Helper function to get the date for next week
function getNextWeekDate(date) {
    const nextWeek = new Date(date);
    nextWeek.setDate(nextWeek.getDate() + 7);  // Move the date 7 days forward
    return nextWeek.toISOString().split('T')[0];  // Return as YYYY-MM-DD
}

// Function to get on-call engineers from DynamoDB for a specific date
async function getOnCallEngineers(date) {
    try {
        console.log('Scanning for on-call engineers for date:', date);

        // Get the next week's date
        const nextWeekDate = getNextWeekDate(date);
        console.log('Next week’s date:', nextWeekDate);


        const params = {
            TableName: 'OnCallSchedule'  // Your DynamoDB table name
        };

        const command = new ScanCommand(params);
        const result = await dynamodb.send(command);

        console.log('DynamoDB scan result:', JSON.stringify(result, null, 2));  // Log scan result

        let awsEngineer = null;
        let azureEngineer = null;
        let nextAwsEngineer = null;
        let nextAzureEngineer = null;

        result.Items.forEach(item => {
            const startDate = item.Start.S;
            const endDate = item.End.S;

            // Find engineers for the current week
            if (isDateWithinRange(date, startDate, endDate)) {
                if (item.CSP.S === 'AWS') {
                    awsEngineer = {
                        Engineer: item.Engineer.S,
                        Email: item.Email.S,
                    };
                } else if (item.CSP.S === 'Azure') {
                    azureEngineer = {
                        Engineer: item.Engineer.S,
                        Email: item.Email.S,
                    };
                }
            }

            // Find engineers for the next week
            if (isDateWithinRange(nextWeekDate, startDate, endDate)) {
                if (item.CSP.S === 'AWS') {
                    nextAwsEngineer = {
                        Engineer: item.Engineer.S,
                        Email: item.Email.S,
                    };
                } else if (item.CSP.S === 'Azure') {
                    nextAzureEngineer = {
                        Engineer: item.Engineer.S,
                        Email: item.Email.S,
                    };
                }
            }
        });

        console.log('Current on-call AWS:', awsEngineer);
        console.log('Current on-call Azure:', azureEngineer);
        console.log('Next on-call AWS:', nextAwsEngineer);
        console.log('Next on-call Azure:', nextAzureEngineer);

        return {
            currentOnCall: {
                aws: awsEngineer,
                azure: azureEngineer
            },
            nextOnCall: {
                aws: nextAwsEngineer,
                azure: nextAzureEngineer
            }
        };

    } catch (error) {
        console.error('Error scanning DynamoDB:', error);  // Log the detailed error
        throw error;
    }
}

// POST route to get on-call engineers for a specific date, or use today's date
app.post('/getOnCall', async (req, res) => {
    const { date } = req.body;
    const currentDate = date || getCurrentDate();  // Use the provided date or default to today
    try {
        const onCallInfo = await getOnCallEngineers(currentDate);
        res.json(onCallInfo);
    } catch (error) {
        console.error("Error fetching on-call schedule:", error);
        res.status(500).send("Internal Server Error");
    }
});

// GET route to manually test via browser (optional)
app.get('/getOnCall', async (req, res) => {
    const date = req.query.date || getCurrentDate();  // Use the provided date or default to today
    try {
        const onCallInfo = await getOnCallEngineers(date);
        res.json(onCallInfo);
    } catch (error) {
        console.error("Error fetching on-call schedule:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
});
