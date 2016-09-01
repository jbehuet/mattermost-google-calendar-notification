var config = require('./config.json');

module.exports = {
    cron: process.env.cron || config.cron,
    host: process.env.host || config.host,
    port: process.env.port ||  config.port,
    icon_url: config.icon_url || "",
    message_title: config.message_title || "Aujourd'hui :\n",
    calendars: config.calendars || []
}
