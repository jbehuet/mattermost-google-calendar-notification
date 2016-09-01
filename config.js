var config = require('./config.json');

module.exports = {
    access: config.access || {},
    port: process.env.port ||  config.port,
    cron: process.env.cron || config.cron,
    webhook_host: process.env.webhook_host || config.webhook_host,
    webhook_port: process.env.webhook_port || config.webhook_port,
    icon_url: config.icon_url || "",
    message_title: config.message_title || "Aujourd'hui :\n",
    calendars: config.calendars || []
}
