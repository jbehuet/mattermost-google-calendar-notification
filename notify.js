#!/usr/bin/env node

(function() {
    'use strict';
    var config = require('./config.json'),
        pad = require('pad'),
        ical = require('ical'),
        https = require('https'),
        Moment = require('moment-timezone'),
        Q = require('q');

    function readCalendar(calendar) {
        var deferred = Q.defer();

        ical.fromURL('https://calendar.google.com/calendar/ical/' + calendar.ical + '/public/basic.ics', {}, function(err, data) {
            calendar.success = (!err);
            if (err) {
                deferred.reject(err);
            } else {

                var start = new Date(Moment.tz('Europe/Paris').format());
                start.setHours(0);
                start.setMinutes(0);
                start.setMilliseconds(0);

                var end = new Date(Moment.tz('Europe/Paris').format());
                end.setHours(23);
                end.setMinutes(59);
                end.setMilliseconds(0);

                calendar.messages = "";

                for (var k in data) {
                    if (data.hasOwnProperty(k)) {
                        var ev = data[k];

                        ev.start = new Date(Moment.tz(ev.start, 'Europe/Paris').format());
                        ev.end = new Date(Moment.tz(ev.end, 'Europe/Paris').format());

                        if (ev.start >= start && ev.end <= end) {
                            //ev.start = new Date(Moment.tz(ev.start, 'America/Los_Angeles').format());
                            //ev.end = new Date(Moment(ev.end).tz('Europe/Paris').format());
                            calendar.messages += "### De " + ev.start.getHours() + ":" + pad(2, ev.start.getMinutes(), "0") + " à " + ev.end.getHours() + ":" + pad(2, ev.end.getMinutes(), "0") + " : " + ev.summary + "\n";
                        }

                    }
                }

                deferred.resolve(calendar);
            }
        });
        return deferred.promise;
    }

    function sendHook(calendar) {

        var deferred = Q.defer();
        var options = {
            host: config.webhook_host,
            port: config.webhook_port,
            path: calendar.webhook_path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        var body = {};
        body.username = "Calendar";
        body.icon_url = config.icon_url;
        body.text = config.message_title + (calendar.messages || config.default_message);

        if (process.env.ENV !== 'DEV') {
            var req = https.request(options, function(res) {
                if (res.statusCode === 200) {
                    deferred.resolve(calendar.name + " Success");
                } else  {
                    res.setEncoding('utf8');
                    res.on('data', function(body) {
                        deferred.reject('problem with request: ' + body);
                    });
                }
            });
            req.on('error', function(e) {
                deferred.reject('problem with request: ' + e.message);
            });
            // write data to request body
            req.write(JSON.stringify(body));
            req.end();
        } else {
            deferred.resolve(body.text);
        }

        return deferred.promise;
    }


    Q.all(config.calendars.map(function(calendar) {
        return readCalendar(calendar);
    })).then(function(calendars) {
        Q.all(calendars.map(function(calendar) {
            return sendHook(calendar)
        })).then(function(message) {
            console.log(message);
        }).catch(function(err) {
            console.log(err);
        });
    }).catch(function(err) {
        console.log(err);
    });

})()
