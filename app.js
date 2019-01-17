const express = require('express');
const app = express();
const mongoose = require('mongoose')
const mongoDB = 'mongodb://127.0.0.1/clicker';
const bodyParser = require('body-parser')
const session = require('express-session')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested With, Content-Type, Accept');
   next();
});
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
app.use(session({
    secret: 'eminem', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
mongoose.connect(mongoDB, { useNewUrlParser: true });
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var db = mongoose.connection;
var User = require('./models/User');
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
const server = app.listen(3001, function() {
    console.log('server running on port 3001');
});
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
    passport.use('local-login', new LocalStrategy(
    function(username, password, done) { // callback with email and password from our form
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'username' :  username }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);

            // if no user is found, return the message
            if (!user)
                return done(null, false); // req.flash is the way to set flashdata using connect-flash

            // if the user is found but the password is wrong
            if (!user.validPassword(password))
                return done(null, false); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            return done(null, user);
        });

    }));

const io = require('socket.io')(server);
app.post('/register', (req, res) => {
	createNewUser(req.body)
	.then((returned) => {
			res.redirect('/start')
	}).catch(e => {
		console.log('user exists!')
		res.send('user exists')
	})
})
app.post('/login',
  passport.authenticate('local-login', { successRedirect: '/start',
                                   failureRedirect: '/'
                                   })
);
app.get('/', (req,res) => {
	res.send('Please login or register.')
})
app.get('/start', (req, res) => {
	console.log('user connected')
})
	io.on('connection', function(socket) {
	    console.log(socket.id)
	    socket.on('DAMAGE', data => {
	    	socket.emit('ATTACK', { amount : data.amount, socketId : socket.id})
	    	console.log('user hit a monster for ' + data.amount + '!')
	    })

	    socket.on('KILL-MONSTER', data => {
	    	let amount =  Math.round(((data.monsterHP / 15) * Math.floor(((0 / 100) + 1))));
	    	console.log('user killed a monster and earned ' + amount + ' gold!')
	    	socket.emit('GOLD', { goldAmount : amount, socketId : socket.id})
	    })
	});
let createNewUser = (userInfo) => new Promise((resolve, reject) => {
    User.findOne({ 'username' :  userInfo.username }, function(err, user) {
        // if there are any errors, return the error
        if (err)
        	console.log(err)
        	reject(err)
        // check to see if theres already a user with that email
        if (user) {
            reject(err)
        } else {
            var newUser            = new User();
            newUser.username    = userInfo.username;
            newUser.email    = userInfo.email;
            newUser.password = newUser.generateHash(userInfo.password);
			newUser.save(function(err) {
                resolve(userInfo)
            })
        }                      
    })
})

