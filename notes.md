 python3 -m venv venv 
 source venv/bin/activate

docker run -v "$PWD":/var/task:ro,delegated -p 9000:8080 amazon/aws-lambda-python:3.8 lambda_function.lambda_handler

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'

dynamo
docker pull amazon/dynamodb-local
docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local
docker ps


persistent storage
docker run -d -p 8000:8000 --name dynamodb-local \
-v $(pwd)/dynamodb:/home/dynamodblocal/data \
amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data



aws dynamodb list-tables --endpoint-url http://localhost:8000


1.	Set up Local Lambda and DynamoDB on Containers:
	•	We’ll use LocalStack or SAM CLI (AWS Serverless Application Model) to run Lambda and DynamoDB locally in Docker containers.
	•	You’ll need Docker installed on your Mac for container management.
	2.	Set up a Local Website:
	•	We’ll create a simple website to display and interact with data, using basic HTML, CSS, and JavaScript.
	•	The website will run locally on your Mac, interacting with the local Lambda functions and DynamoDB.
	3.	Database Setup (DynamoDB):
	•	Import data from your spreadsheet into the local DynamoDB instance.
	•	We’ll create a Lambda function to allow database updates via the website.
	4.	Integrating the Website with Lambda and DynamoDB:
	•	Use JavaScript on the front end to make API calls to your local Lambda, which will interact with DynamoDB for reading and updating the data.
	5.	Transition to AWS:
	•	Once the local version is working, we’ll deploy the Lambda function, DynamoDB, and the website to AWS (using S3 to host the static site, API Gateway, Lambda, and DynamoDB).

Step 1: Set up Local Lambda and DynamoDB with LocalStack

1.1. Install Docker:

If you haven’t installed Docker, download it from here.

1.2. Install LocalStack:

LocalStack simulates AWS services locally in Docker. We will use it to run Lambda and DynamoDB on your Mac.

	•	Install LocalStack:

    pip install localstack
    localstack start


1.3. Set up Local Lambda and DynamoDB:

	•	To set up DynamoDB, you can use the AWS CLI with LocalStack:


    aws --endpoint-url=http://localhost:4566 dynamodb create-table \
  --table-name OnCallSchedule \
  --attribute-definitions AttributeName=ID,AttributeType=S \
  --key-schema AttributeName=ID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

  	•	Create a Lambda function locally using a simple Python or Node.js script. Example of a Python Lambda handler:

    import json
import boto3

dynamodb = boto3.resource('dynamodb', endpoint_url='http://localhost:4566')

def lambda_handler(event, context):
    table = dynamodb.Table('OnCallSchedule')
    # Perform read/write operations here
    return {
        'statusCode': 200,
        'body': json.dumps('Operation successful')
    }


    Step 2: Set up the Local Website

2.1. Create a Basic Webpage:

	•	Create a index.html file with a simple form to allow users to query the on-call schedule.

    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Who Is On Call</title>
</head>
<body>
    <h1>Who Is On Call</h1>
    <form id="onCallForm">
        <label for="onCallDate">Select Date:</label>
        <input type="date" id="onCallDate" name="onCallDate">
        <button type="submit">Get On Call</button>
    </form>

    <div id="onCallResult"></div>

    <script>
        document.getElementById('onCallForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const date = document.getElementById('onCallDate').value;

            fetch('http://localhost:3000/getOnCall', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date: date })
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('onCallResult').innerText = `On Call: ${data.name}`;
            });
        });
    </script>
</body>
</html>


Step 3: Connect Website with Local Lambda and DynamoDB

3.1. Run a Local API (Node.js or Flask):

We can use Flask for Python or Express.js for Node.js to handle requests between the webpage and your local Lambda functions.

For example, using Express.js:

npm init -y
npm install express body-parser axios

Create server.js

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

app.post('/getOnCall', async (req, res) => {
    const { date } = req.body;
    
    // Call local Lambda
    const response = await axios.post('http://localhost:4566/restapis/your-api-id/lambda-endpoint', {
        date: date
    });

    res.json(response.data);
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});


Step 4: Transition to AWS

Once the local setup works, we will:

	•	Deploy your Lambda functions and DynamoDB using SAM or Serverless Framework.
	•	Host the website on S3 and expose the Lambda function via API Gateway.





    and then importing the data into DynamoDB, we can break this down into several steps:

	1.	Upload the spreadsheet to a simulated S3 bucket.
	2.	Convert the spreadsheet to CSV.
	3.	Parse the CSV file and import the data into DynamoDB.
	4.	Trigger the process with a Lambda function (locally for now).

We’ll automate this by triggering the Lambda function when a file is uploaded to S3 (local). Let’s go step by step.

Step 1: Upload Spreadsheet to Simulated S3 Bucket

You can simulate S3 with LocalStack. Start by creating a new S3 bucket:

aws --endpoint-url=http://localhost:4566 s3 mb s3://oncall-schedule-bucket

Next, upload your Excel spreadsheet to this bucket:

aws --endpoint-url=http://localhost:4566 s3 cp /path/to/your/spreadsheet.xlsx s3://oncall-schedule-bucket/oncall-schedule.xlsx

Step 2: Lambda Function to Handle Spreadsheet Upload

We will create a Lambda function that:

	•	Gets triggered when a new file is uploaded to S3.
	•	Downloads the spreadsheet from S3.
	•	Converts the spreadsheet to a CSV file.
	•	Parses the CSV and imports the data into DynamoDB.

Python Lambda to Handle the Workflow

Make sure your Lambda has the following packages:

	•	boto3 (for S3 and DynamoDB interaction)
	•	pandas or openpyxl (for Excel to CSV conversion)

Here’s an example of how the Lambda can work:



Step 3: Configure S3 Event to Trigger Lambda

To trigger the Lambda function when a file is uploaded to S3 (simulated in LocalStack), you need to configure an S3 event.

You can set up this event using the AWS CLI:

aws --endpoint-url=http://localhost:4566 s3api put-bucket-notification-configuration \
    --bucket oncall-schedule-bucket \
    --notification-configuration '{
      "LambdaFunctionConfigurations": [
        {
          "LambdaFunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:your-lambda-function-name",
          "Events": ["s3:ObjectCreated:*"]
        }
      ]
    }'

    Step 4: Test the Workflow

	1.	Upload the spreadsheet to the simulated S3 bucket:

    aws --endpoint-url=http://localhost:4566 s3 cp /path/to/your/spreadsheet.xlsx s3://oncall-schedule-bucket/oncall-schedule.xlsx

    	2.	Check the Lambda logs (you can add print() statements in your Lambda function to debug or check what’s happening):

        awslocal logs tail /aws/lambda/your-lambda-function-name

        	3.	Verify DynamoDB Data:
Query the DynamoDB table to check if the data was inserted correctly:

aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name OnCallSchedule


convert s3 bucket to csv

pip install pandas openpyxl



aws --endpoint-url=http://localhost:4566 lambda invoke --function-name process_csv --payload file://s3_event.json --cli-binary-format raw-in-base64-out response.json


docker run --rm -it -p 4566:4566 -p 4571:4571 localstack/localstack

### Zip file for lambda. Too large to upload to github.

```
zip -r lambda_function.zip .
aws --endpoint-url=http://127.0.0.1:4566 lambda update-function-code --function-name process_csv --zip-file fileb://lambda_function.zip
```

### Invoke Lambda function

```
aws --endpoint-url=http://127.0.0.1:4566 lambda invoke --function-name process_csv --payload file://s3_event.json --cli-binary-format raw-in-base64-out response.json
```

npm install xlsx
npm install aws-sdk csv-parser
npm install helmet
npm install express body-parser axios

## Make zip file smaller

zip -r lambda-function.zip . -x "node_modules/*" ".git/*" "*.npmignore"  