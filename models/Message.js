var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
    poster: String,
    messageContent: String,
    date: String,
});

var Message = mongoose.model('Message', messageSchema);
module.exports = Message;