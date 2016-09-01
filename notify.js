(function() {
    'use strict';
    var config = require('./config.js'),
        pad = require('pad'),
        ical = require('ical'),
        http = require('http'),
        https = require('https'),
        auth = require('basic-auth'),
        CronJob = require('cron').CronJob;

    new CronJob(config.cron, function() {

            config.calendars.map(function(calendar) {

                var options = {
                    host: config.webhook_host,
                    port: config.webhook_port,
                    path: calendar.webhook_path,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                };

                ical.fromURL('https://calendar.google.com/calendar/ical/' + calendar.ical + '/public/basic.ics', {}, function(err, data) {
                    calendar.success = (!err);
                    if (err) {
                        return;
                    }

                    var offset = new Date().getTimezoneOffset() / 60;

                    var start = new Date();
                    start.setHours(0);
                    start.setMinutes(0);
                    start.setMilliseconds(0);

                    var end = new Date();
                    end.setHours(23);
                    end.setMinutes(59);
                    end.setMilliseconds(0);

                    var messages = "";

                    for (var k in data) {
                        if (data.hasOwnProperty(k)) {
                            var ev = data[k];
                            ev.dateStart = new Date(ev.start);
                            ev.dateStart.setHours(ev.dateStart.getHours() + Math.abs(offset));
                            ev.dateStart.setMilliseconds(0);

                            ev.dateEnd = new Date(ev.end);
                            ev.dateEnd.setHours(ev.dateEnd.getHours() + Math.abs(offset));
                            ev.dateEnd.setMilliseconds(0);

                            ev.start = new Date(ev.start);
                            ev.end = new Date(ev.end)

                            if (ev.dateStart >= start && ev.dateStart <= end) {
                                messages += "### De " + ev.start.getHours() + ":" + pad(2, ev.start.getMinutes(), "0") + " à " + ev.end.getHours() + ":" + pad(2, ev.end.getMinutes(), "0") + " : " + ev.summary + "\n";
                            }

                        }
                    }

                    if (messages !== "") {
                        var body = {};
                        body.username = "Calendar";
                        body.icon_url = config.icon_url;
                        body.text = config.message_title + messages;

                        if (process.env.ENV !== 'DEV') {
                            var req = https.request(options, function(res) {
                                if (res.statusCode === 200) {
                                    console.log("CronJob SUCCESS");
                                } else  {
                                    res.setEncoding('utf8');
                                    res.on('data', function(body) {
                                        console.log('Body: ' + body);
                                    });
                                }
                            });
                            req.on('error', function(e) {
                                console.log('problem with request: ' + e.message);
                            });
                            // write data to request body
                            req.write(JSON.stringify(body));
                            req.end();
                        } else {
                            console.log(body.text);
                        }
                    }
                });
            })


        }, function() {
            //on end cron
        },
        true,
        'Europe/Paris'
    );


    //We need a function which handles requests and send response
    function handleRequest(request, response) {
        var credentials = auth(request)

        if (!credentials || credentials.name !== config.access.username || credentials.pass !== config.access.password) {
            response.statusCode = 401
            response.setHeader('WWW-Authenticate', 'Basic realm="example"')
            response.end('Access denied')
        } else {
            var res = "";
            config.calendars.forEach(function(calendar) {
                res += calendar.ical + " : ";
                if (calendar.hasOwnProperty('success')) {
                    res += (calendar.success ? "OK" : "KO");
                } else {
                    res += "-";
                }

            });
            response.end('Cron schedule ' + config.cron + '\n' + res);
        }

    }

    //Create a server
    var server = http.createServer(handleRequest);

    //Lets start our server
    server.listen(config.port, function() {
        //Callback triggered when server is successfully listening. Hurray!
        console.log("Server listening on: http://localhost:%s", config.port);
    });

})()
