import pandas as pd

# Path to your Excel file
excel_file = 'oncall_schedule.xlsx'

# Convert the spreadsheet to a CSV file
df = pd.read_excel(excel_file)

# Save the DataFrame as a CSV
csv_file = 'output.csv'
df.to_csv(csv_file, index=False)

print(f"CSV file saved as {csv_file}")