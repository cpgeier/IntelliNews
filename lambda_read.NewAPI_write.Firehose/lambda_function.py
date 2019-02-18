import boto3
import json
import time
from datetime import date
from newsapi import NewsApiClient

def lambda_handler(event, context):
    
    client = boto3.client('firehose')
    
    client.describe_delivery_stream(DeliveryStreamName='vthacks-data-stream')
    NEWSAPIKEY = "####" # Your API key
    newsapi = NewsApiClient(api_key=NEWSAPIKEY)
    for page in range(1,1):
        print('page: ' + str(page))

        all_articles = newsapi.get_everything(q='trump',
                                              from_param=date.today().isoformat(),
                                              to=date.today().isoformat(),
                                              language='en',
                                              page=page)
        print(len(all_articles['articles']))
        for i in all_articles['articles']:
            if all_articles['status'] == "ok":
                art = {
                    "author": str(i['author']).replace("\'", ''),
                    "source": str(i['source']['name']).replace("\'", ''),
                    "title": str(i['title']).replace("\'", ''),
                    "description": str(i['description']).replace("\'", ''),
                    "url": str(i['url']).replace("\'", ''),
                    "publish_date": str(i['publishedAt']).replace("\'", '')
                }
                print(art)
                client.put_record(
                    DeliveryStreamName='vthacks-data-stream',
                    Record={
                        "Data": json.dumps(art)+"\n"
                    }
                )
            else:
                print("NEWS API ERROR")

    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
