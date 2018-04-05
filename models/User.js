var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    uname: String,
    pass: String,
    isAdmin: Boolean,
    banned: Boolean,
    background: String,
});

var User = mongoose.model('User', userSchema);
module.exports = User;