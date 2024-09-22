const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const xlsx = require('xlsx');
const app = express();
const port = 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load the on-call schedule from the Excel file
const workbook = xlsx.readFile('scripts/oncall_schedule.xlsx');
const sheetName = workbook.SheetNames[0];
const onCallData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

// Function to find the engineers based on the date
function getOnCallEngineers(date) {
    const currentDate = new Date(date);
    let currentOnCall = null;
    let nextOnCall = null;

    for (let i = 0; i < onCallData.length; i++) {
        const startDate = new Date(onCallData[i].Start);
        const endDate = new Date(onCallData[i].End);

        // If the current date falls within the range OR matches the end date
        if ((currentDate >= startDate && currentDate <= endDate) || currentDate.getTime() === endDate.getTime()) {
            // Find current engineers for AWS and Azure
            currentOnCall = {
                aws: onCallData.find(row => row.CSP === 'AWS' && row.Start === onCallData[i].Start),
                azure: onCallData.find(row => row.CSP === 'Azure' && row.Start === onCallData[i].Start),
            };

            // Get the engineers for the next week (from the next row)
            const nextWeekIndex = i + 1;
            if (nextWeekIndex < onCallData.length) {
                nextOnCall = {
                    aws: onCallData.find(row => row.CSP === 'AWS' && row.Start === onCallData[nextWeekIndex].Start),
                    azure: onCallData.find(row => row.CSP === 'Azure' && row.Start === onCallData[nextWeekIndex].Start),
                };
            }
            break;
        }
    }

    return { currentOnCall, nextOnCall };
}

// API to get on-call engineers for a given date
app.post('/getOnCall', (req, res) => {
    const { date } = req.body;
    const onCallInfo = getOnCallEngineers(date);
    res.json(onCallInfo);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});