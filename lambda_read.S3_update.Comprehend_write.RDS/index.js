var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var comprehend = new AWS.Comprehend();
const { Pool, Client } = require('pg')
var util = require('util');
var pg = require("pg");
const pool = new Pool();

var final_data = [];

/* Not correct for node, but useful in 
    working around Comprehend API calls/sec limit */
function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

exports.handler = async (event) => {
    // TODO: Make this actually return something
    const response = {
        statusCode: 200,
        body: JSON.stringify("wow"),
    };
    try {
        console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
        var srcBucket = event.Records[0].s3.bucket.name;
        // Object key may have spaces or unicode non-ASCII characters.
        var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
        
        // Start then() chaining 
        await s3.getObject({
            Bucket: srcBucket, 
            Key: srcKey 
        }, function(err, data) {
            // Handle any error and exit
            if (err) {
                console.log(err);
                return err;
            }
            return data;
        }).promise().then((jsonstring) => {
            // Call comprehend and add to record

            console.log("start"); // TODO: Add more logging
            let news_output = jsonstring.Body.toString('utf8').split(/\r?\n/);

            var promise_list = []; 
            let value;
            news_output.forEach((value) => { 
                promise_list.push(new Promise(async (resolve, reject) => {
                    try {
                        await sleep(100); // Work around for API throttle limit
                        console.log(value);
                        let news = JSON.parse(value);
                        var params = {
                            LanguageCode: "en", 
                            Text: news['description']
                        };
                        comprehend.detectSentiment(params, function(err, target_data) {
                            if (err) console.log(err, err.stack); // an error occurred
                            else {
                               news['Positive'] = target_data['SentimentScore']['Positive'];
                               news['Negative'] = target_data['SentimentScore']['Negative'];
                               news['Mixed'] = target_data['SentimentScore']['Mixed'];
                               news['Neutral'] = target_data['SentimentScore']['Neutral'];
                               final_data.push(news);
                            }
                            resolve();
                        });
                    }
                    catch (err) {
                        console.log("At Comprehend: ");
                        console.log(err);
                        resolve();
                    }
                }));
            });
            return Promise.all(promise_list);
        }).then(() => {
            // Add to postgres

            console.log("Starting postgres add")
            var promise_list = []; 
            final_data.forEach((value) => {
                promise_list.push(new Promise((resolve, reject) => {
                    // TODO: Just add by jsonb instead of by field
                    let final_string = "";
                    final_string += "('";
                    final_string += value['title'] + "', '" +
                    value['description'] + "', '" + 
                    value['Positive'] + "', '" + 
                    value['Negative'] + "', '" + 
                    value['Mixed'] + "', '" + 
                    value['Neutral'] + "', '" + 
                    value['author'] + "', '" + 
                    value['publish_date'] + "', '" +
                    value['source'] + "', '" + 
                    value['url'] + "', '" + 
                    value['source'] + "'";
                    final_string += ");";
                    console.log("INSERT:" + final_string);
                    
                    try {
                        pool.query("INSERT INTO articles ( \
                        article_title, \
                        article_description, \
                        positive_sentiment, \
                        negative_sentiment, \
                        neutral_sentiment, \
                        mixed_sentiment, \
                        author, \
                        publish_date, \
                        site_name, \
                        url_link, \
                        media_type) \
                        VALUES " + final_string, (err, res) => {
                          console.log("Pool callback:");
                          console.log(err, res);
                          resolve();
                        });
                    }
                    catch (err) {
                        console.log(err);
                        resolve();
                    }
                }))
            });
            return Promise.all(promise_list);
        }).then(() => {
            pool.end()
            
        }).catch((err) => {console.log(err)});
        
    }
    catch (err) {
        console.log(err);
        return err;
    }
    return response;
};
