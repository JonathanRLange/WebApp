var http = require('http'),
    fs = require('fs'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    sessions = require('express-session'),
    credentials = require('./credentials.js'),
    md5 = require('md5');
    var app = express();
    var User = require('./models/User.js');
    var Message = require('./models/Message.js');

    app.use(bodyParser());
    app.use(require('cookie-parser')(credentials.cookieSecret));
    app.use(require('express-session')());

    // set up handlebars view engine
    var handlebars = require('express3-handlebars')
    .create({ defaultLayout:'main' });
    app.engine('handlebars', handlebars.engine);
    app.set('view engine', 'handlebars');

    var mongoose = require('mongoose');
    var opts = {
        server: {
        socketOptions: { keepAlive: 1 }
        }
    };
    console.log(
        app.get('env'),
        app.get('db_user'),
        app.get('db_pass')
    )
    switch(app.get('env')){
        case 'development':
        mongoose.connect(credentials.mongo.development.connectionString, opts);
        break;
        case 'production':
        mongoose.connect(credentials.mongo.production.connectionString, opts);
        break;
        default:
        throw new Error('Unknown execution environment: ' + app.get('env'));
    }
    const db = mongoose.connection
    User.find(function(err, Users){
        if(Users.length) return;
        new User({
        uname: 'admin',
        pass: md5('admin'),
        isAdmin: true,
        banned: false,
        background: 'White',
        }).save();
    });

    app.set('port', process.env.PORT || 3011);

    app.use(express.static(__dirname + '/public'));

    function checklogin (req, res, user, password) {
        User.findOne({uname: user}, function(err, user) {
            if (err) {
                res.render('login',{message: 'Error accesing database. Try again'});
            } else if (user.pass == md5(password)) {
                if(user.isAdmin){req.session.admin = true;}
                if(user.banned){req.session.ban = true;}
                req.session.userName = user;
                res.redirect(303, 'commonBoard');
            } else {
                res.render('login',{message: 'Username or password was not valid. Try again'});
            }
        });
    };


    app.get('/', function(req, res){
        res.render('login');
    });

    app.post('/', function(req, res){
            checklogin(req, res, req.body.userName.trim(), req.body.password.trim())
    });

    app.post('/postMessage', function(req, res){
    var newMessage = Message({
        poster: req.session.userName.uname,
        messageContent: req.body.message,
        date: new Date(),
    });
    newMessage.save(function(err) {
        if (err) {
            console.log('Error adding new message ' + err);
        }});
        res.redirect(303, 'commonBoard');
    });
    
    app.post('/logOut', function(req, res){
        delete req.session.userName;
        if(req.session.admin) {delete req.session.admin;}
        if(req.session.ban) {delete req.session.ban;}
        res.redirect(303, '/');
    });

    app.post('/deleteMessage', function(req, res){
        var recContent = req.body.content;
        Message.findByIdAndRemove(recContent).exec();
        res.redirect(303, 'userPosts');
    });

    app.post('/adminDeleteMessage', function(req, res){
        var recContent = req.body.content;
        Message.findByIdAndRemove(recContent).exec();
        res.redirect(303, 'commonBoard');
    });

    app.post('/createUser', function(req, res){
        var newUser = User({
            uname: req.body.userName,
            pass: md5(req.body.password),
            isAdmin: false,
            banned: false,
            background: 'White',
        });
        newUser.save(function(err) {
            if (err) {
                console.log('Error adding new user ' + err);
            }});
            res.redirect(303, 'users');
        });

        app.post('/deleteUser', function(req, res){
            var recContent = req.body.content;
            User.findByIdAndRemove(recContent).exec();
            res.redirect(303, 'users');
        });

        app.post('/ban', function(req, res){
            var recContent = req.body.content;
            User.findById(recContent, function(err, doc){
                if(err){
                    console.error('error, no entry found');
                }
                doc.banned = true;
                doc.save();
            })
            res.redirect(303, 'users');
        });

        app.post('/unban', function(req, res){
            var recContent = req.body.content;
            User.findById(recContent, function(err, doc){
                if(err){
                    console.error('error, no entry found');
                }
                doc.banned = false;
                doc.save();
            })
            res.redirect(303, 'users');
        });

        app.post('/updateBackground', function(req, res){
            //var recContent = req.body.content;
            User.findById(req.session.userName._id, function(err, doc){
                if(err){
                    console.error('error, no entry found');
                }
                doc.background = req.body.backgroundColor;
                doc.save();
            })
            req.session.userName.background = req.body.backgroundColor;
            res.redirect(303, 'settings');
        });

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    app.get('/commonBoard', function(req, res){
        if (req.session.userName) {
            Message.find( function(err, messages){
                var context = {
                messages: messages.map(function(message){
                    return {
                        _id: message._id,
                        poster: message.poster,
                        messageContent: message.messageContent,
                        date: message.date,
                        }
                        })
                        };
                        context['background'] = req.session.userName.background;
                        if(req.session.admin){
                            context['admin'] = true;
                            res.render('commonBoard', context);
                        }
                        else if(req.session.ban){
                            context['ban'] = true;
                            res.render('commonBoard', context);
                            }
                        else{
                        res.render('commonBoard', context);
                        }
                        });
            //res.render('commonBoard');
        } else {
            res.render('login',{message: 'Please login to access the home page'});
        }
    });

    app.get('/userPosts', function(req, res){
        if (req.session.userName) {
            Message.find({ 'poster': req.session.userName.uname }, function(err, messages){
                var context = {
                messages: messages.map(function(message){
                    return {
                        _id: message._id,
                        poster: message.poster,
                        messageContent: message.messageContent,
                        date: message.date,
                        }
                        })
                        };
                        context['background'] = req.session.userName.background;
                        if(req.session.admin){
                            context['admin'] = true;
                            res.render('userPosts', context);
                        }
                        else{
                        res.render('userPosts', context);
                        }
                        });
            //res.render('commonBoard');
        } else {
            res.render('login',{message: 'Please login to access the home page'});
        }
    });

    app.get('/settings', function(req, res){
        if (req.session.userName) {
            var context = {};
            context['background'] = req.session.userName.background;
            if(req.session.admin){
                context['admin'] = true;
                res.render('settings', context);
            }
            else{
            res.render('settings');
            }
        } else {
            res.render('login',{message: 'Please login to access the home page'});
        }
    });

    app.get('/users', function(req, res){
        if (req.session.userName && req.session.admin) {
            User.find( function(err, users){
                var context = {
                users: users.map(function(user){
                    return {
                        _id: user._id,
                        uname: user.uname,
                        pass: user.pass,
                        }
                        })
                        };
                        context['background'] = req.session.userName.background;
                        if(req.session.admin){
                            context['admin'] = true;
                            res.render('users', context);
                        }
                        else{
                        res.render('users', context);
                        }
                        });
            //res.render('users');
        } else {
            res.render('login',{message: 'Please login as admin access the home page'});
        }
    });


        // 404 catch-all handler (middleware)
        app.use(function(req, res, next){
        res.status(404);
        res.render('404');
        });

        // 500 error handler (middleware)
        app.use(function(err, req, res, next){
        console.error(err.stack);
        res.status(500);
        res.render('500');
        });

    db
    .on('error', function( err ){ console.log(err) } )
    .once( 'open', function(){ console.log( 'database connected' ) } )
    app.listen(app.get('port'), function(){
    console.log( 'Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.' );
    });