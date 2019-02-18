# IntelliNews
Providing no-click bias analytics for online news sources. Microstrategy Analytics Prize Winner at VTHacks 2019. 

## Solution

A real-time data processing pipeline using AWS Kinesis Firehose, S3, Lambda, Comprehend, and RDS.

## Useful tools in this repo

- AWS Lambda functions
- Adding to AWS Firehose (python)

## Lambda functions

The main Lambda function to process firehose data does the following:
1. Reads Firehose data from S3
2. Calls AWS Comprehend API to add sentiment to data
3. Adds records to postgres database


The other Lambda function can be scheduled to run every time interval to stream data into Kinesis Firehose.
1. Calls NewsAPI to collect data for streaming
2. Cleans NewsAPI response
3. Puts record into AWS firehose

## Notes

- API Keys and envirnoment variables are not added, be sure to add them if you are trying to use these scripts
- Lambda functions are added as lambda_(general function). Make sure to zip contents to add as lambda functions
