const express = require('express');
const app = express();
const mongoose = require('mongoose')
const mongoDB = 'mongodb://127.0.0.1/clicker';
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const server = app.listen(3001, function() {
    console.log('server running on port 3001');
});
const session = require('express-session')
const io = require('socket.io')(server);
const mongoStore     = require('connect-mongo')(session); 
const passportSocketIo = require("passport.socketio");
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
mongoose.connect(mongoDB, { useNewUrlParser: true });
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var db = mongoose.connection;
var sessionStore = new mongoStore({
mongooseConnection: db });
app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested With, Content-Type, Accept');
   next();
});
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,       // the same middleware you registrer in express
  key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
  secret:       'eminem',    // the session_secret to parse the cookie
  store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
  success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
  fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));
app.use(passport.initialize());
app.use(passport.session());
function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');

  // The accept-callback still allows us to decide whether to
  // accept the connection or not.
  accept(null, true);

  // OR

  // If you use socket.io@1.X the callback looks different
  accept();
}

function onAuthorizeFail(data, message, error, accept){
  if(error)
    throw new Error(message);
  console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
  accept(null, false);

  // OR

  // If you use socket.io@1.X the callback looks different
  // If you don't want to accept the connection
  if(error)
    accept(new Error(message));
  // this error will be sent to the user as a special error-package
  // see: http://socket.io/docs/client-api/#socket > error-object
}



var User = require('./models/User');
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
    	console.log('checking')
        User.findOne({_id: id}, function(err, user) {
        	console.log(err)
        	console.log(user)
            done(err, user);
        });
    });
    passport.use('local', new LocalStrategy(
    function(username, password, done) { // callback with email and password from our form
        // find a user whose email is the same as the forms email
        console.log(io.sockets.connected[socket.id])
        // we are checking to see if the user trying to login already exists
        User.findOneAndUpdate({ 'username' :  username }, {$set: { 'socketId' : 'test' } },function(err, user) {
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
            console.log(user)
            return done(null, user);
        });

    }));


app.post('/register', (req, res) => {
	createNewUser(req.body)
	.then((returned) => {
			res.redirect('/start')
	}).catch(e => {
		console.log('user exists!')
		res.send('user exists')
	})
})
let userData = '';
app.post('/login', (req,res,next)=> {
        passport.authenticate('local', function(err, user, info ) {
            if (err) {
                console.log("inside error");
            return next(err); 
            }
            if (!user) {
                console.log("No user");
                res.status(401).send("not user");
            } else {  

                req.logIn(user, function(err) {
                 if (err) { return res.send(err); }
                console.log(req.user)
	              console.log('user connected')
                io.sockets.emit('LOGIN', req.user)
              });

            }
        })(req, res, next); 
     });
app.get('/', (req,res) => {
	res.send('Please login or register.')
})
app.get('/start', (req, res) => {
  res.send('ok')
})
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

io.on('connection', function(socket) {
      var clientId = '';
      socket.on('CheckUser', data => {
          User.findOne({ socketId: socket.id}, function(err, user) {
            clientId = user.socketId
            console.log(err)
            console.log(user.username, user.socketId)
          });
      })
	    socket.on('DAMAGE', data => {
	    	io.to(clientId).emit('ATTACK', { amount : data.amount, socketId : socket.id})
	    	console.log('user hit a monster for ' + data.amount + '!')
	    })
	    // socket.on('LOGIN', data => {
	    // 	console.log('user killed a monster and earned ' + amount + ' gold!')
	    // 	socket.emit('LOGIN', { user: req.user })
	    // })
	    socket.on('LEVEL-CHANGE', data => {
	    	console.log('saving user ' + userData.username)
	    	userData.level++
	    	console.log('New level is : ' + userData.level)
	    User.findOneAndUpdate({_id: userData.id}, {
	    	$set: {
	    		level : userData.level,
	    		gold : userData.gold,
	    		monsterCount : userData.monsterCount,
	    		dpc: userData.dpc,
	    		dps: userData.dps
	    	}
	    }, function(err, user) {
	    	io.to(clientId).emit('GOLD', { goldAmount : user.gold, level : user.level, username: user.username})	
        });
	    })
	    socket.on('KILL-MONSTER', data => {
	    	let amount =  Math.round(((data.monsterHP / 15) * Math.floor(((0 / 100) + 1))));
	    	userData.gold = userData.gold + amount
	    	console.log(`${userData.username} killed a monster and earned ${amount} gold!`)
	    	io.to(clientId).emit('GOLD', { goldCount : userData.gold, socketId : socket.id, username: userData.username})
	    })
	   

});