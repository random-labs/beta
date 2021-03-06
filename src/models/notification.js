'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var notificationSchema = new Schema({
    author: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, required: true },
    created_at: { type: Date, default: Date.now, required: true },
    updated_at: { type: Date, required: true },
});

/*, { name: 'notification_index' }*/

module.exports = mongoose.model('notificationSchema', notificationSchema);
