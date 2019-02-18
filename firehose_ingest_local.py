import boto3
import pandas as pd
import json
import base64
import time
from newsapi import NewsApiClient

client = boto3.client('firehose')

client.describe_delivery_stream(DeliveryStreamName='vthacks-data-stream')

NEWSAPIKEY = "#####" # Your API KEY
newsapi = NewsApiClient(api_key=NEWSAPIKEY)

for date in range(3,10):
    print('date: ' + str(date))
    for page in range(1,5):
        print('page: ' + str(page))
        api_count += 1
        newsapi = NewsApiClient(api_key=NEWSAPIKEY)

        all_articles = newsapi.get_everything(q='trump',
                                              from_param='2019-02-0' + str(date),
                                              to='2019-02-0' + str(date),
                                              language='en',
                                              page=page)
        print(len(all_articles['articles']))
        for i in all_articles['articles']:
            if all_articles['status'] == "ok":
                # Construct article object
                # Characters are removed to add into postgres database
                # TODO: Add object to database (using jsonb) rather than by field
                art = {
                    "author": str(i['author']).replace("\'", ''),
                    "source": str(i['source']['name']).replace("\'", ''),
                    "title": str(i['title']).replace("\'", ''),
                    "description": str(i['description']).replace("\'", ''),
                    "url": str(i['url']).replace("\'", ''),
                    "publish_date": str(i['publishedAt']).replace("\'", '')
                }
                print(art)
                # Add article object to stream
                client.put_record(
                    DeliveryStreamName='vthacks-data-stream',
                    Record={
                        "Data": json.dumps(art) + "\n"
                    }
                )
                print(api_count)
            else:
                print("NEWS API ERROR")