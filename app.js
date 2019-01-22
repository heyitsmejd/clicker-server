const express = require('express');
const app = express();
const mongoose = require('mongoose')
const mongoDB = 'mongodb://127.0.0.1/clicker';
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const server = app.listen(3001, function() {
console.log('Server started on port 3001');
});
const session = require('express-session')
const io = require('socket.io')(server);
const MongoStore     = require('connect-mongo')(session); 
const passportSocketIo = require("passport.socketio");
app.use(bodyParser.json());       // to support JSON-encoded bodies
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
app.use(cookieParser('testing'));
var sessionStore = new MongoStore({
mongooseConnection: db });

app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested With, Content-Type, Accept');
   next();
});
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
app.use(session({
        secret: 'testing',
        resave: false,
        saveUninitialized: false,
        store: sessionStore
      }
  ))
app.use(passport.initialize());
app.use(passport.session());
var User = require('./models/User');
var Heroes = require('./models/Heroes');
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    passport.serializeUser(function(user, done) {
        done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    User.findOne({_id: id}, function(err, user) {
        console.log(err)
        done(err, user);
    });
});
passport.use('local', new LocalStrategy(
    function(username, password, done) { 
        User.findOne({ 'username' :  username },function(err, user) {
            if (err)
                return done(err);
                // if no user is found, return the message
        if (!user)
                return done(null, false); 
        // if the user is found but the password is wrong
        if (!user.validPassword(password))
            return done(null, false); // create the loginMessage and save it to session as flashdata
          // all is well, return successful user
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

app.post('/login', (req,res,next)=> {
        passport.authenticate('local', function(err, user, info ) {
          console.log('-------------------')
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
                
                res.redirect('/')
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
            newUser.nextHero = heroes[0]
            newUser.password = newUser.generateHash(userInfo.password);
			newUser.save(function(err) {
                resolve(userInfo)
            })
        }                      
    })
})
var userData = [];
var getUserData = (socket) => {
  return userData.find(i => i.socketId == socket)
}
var getUserHeroData = (id) => {

}
var saveUser = (user) => new Promise((resolve, reject) => {
    User.findOneAndUpdate({_id : user.id}, {
        $set: {
            level : user.level,
            gold : user.gold,
            monsterCount : user.monsterCount
        }}, (err, user) => {
        resolve(user)
    })
})

let currentUsers = 0;
io.on('connection', function(socket) {
    currentUsers++; 
    console.log('User connected : ' + socket.id)
    console.log('Current Players: ' + currentUsers)
    userData.push({socketId : socket.id})
    socket.on('CheckUser', data => { //TODO: not send all user data, only relevant one.
        User.findOne({ username : data.user}, function(err, user) {
            var pushUser = user
            getUserData(socket.id).data = pushUser
            if(getUserData(socket.id).data.monsterCount > 10){
                getUserData(socket.id).data.monsterCount = 10
            }
            io.to(socket.id).emit('LOGIN', pushUser)
        });
    })
	  socket.on('DAMAGE', data => {
        if((data.monsterCurrentHP - data.amount ) <= 0) {
            data.amount = data.monsterCurrentHP;
        }
	    	io.to(socket.id).emit('ATTACK', { amount : data.amount, socketId : socket.id})
	    	console.log('user hit a monster for ' + data.amount + '!')
    })
    socket.on('LEVEL-CHAR', data => {
          var char = heroes.find( slot => slot.name == data.name)
        //   let totalLevelCost = this.getLevelCost(charName);
        //   let endLevel = char.level + this.levelRate;
        //     if(this.goldCount >= totalLevelCost)
        //     {
        //       this.goldCount = this.goldCount - totalLevelCost
        //       char.level = endLevel;
        //       this.calcExtraDps(charName)
        //       char.cost = Math.round(char.baseCost * (1.07 * char.level))
        //       //Lets update our DPS total now.
        //       var totalDps = 0
        //       this.characters.forEach(slot => {
        //         if(slot.bought)
        //         {
        //           totalDps = totalDps + slot.dps
        //         }
        //       })
        //       this.dps = totalDps
        //     }
        // },        
    })
    socket.on('LOGIN', data => { //Unused for now.

    })
    socket.on('BOSS-START', data => { //Start boss round
        io.to(socket.id).emit('BOSS-START', { timeLimit : 30000 })
        setTimeout(() => io.to(socket.id).emit('BOSS-END', {}), 30000)
    })
    socket.on('BOSS-END', data => { //Unused for now.
        // Check if boss killed before time ended
        if(data.bossHP > 0){
            getUserData(socket.id).data.bossKilled = false
            console.log('User failed to defeat boss on level : ' + getUserData(socket.id).data.level)
            console.log('Putting them back on previouss level at 10/10.')
            getUserData(socket.id).data.level--
            let bossFight = false
            saveUser(getUserData(socket.id).data).then( returned => {
                io.to(socket.id).emit('DOWN-LEVEL', { 
                  monsterCount : 10,
                  level : getUserData(socket.id).data.level, 
                  bossKilled: getUserData(socket.id).data.bossKilled
                })  
            }).catch(e => console.log(e));            
        }
        // If not, repeat previous round at 10/10... Have button shown to go back to boss.

        // If so, go to new round, change mons count to 1/10 and start new level.
        // if(data.bossHP <= 0){

        // }
    })
    socket.on('BUY-CHAR', data => {
     var buyingHero = heroes.find( slot => slot.name == data.name )
        buyHero(getUserData(socket.id).data._id, buyingHero.name, buyingHero.baseCost, socket.id).then(res => {
            getUserData(socket.id).data.dps = res.dps
            io.to(socket.id).emit('BUY-CHAR', { bought : res.heroes, next: res.nextHero, gold: res.gold, dps : res.dps })
        }).catch(e => {
            //This should only happen if the user has the Hero
            console.log(e)
        })
     })
    socket.on('LEVEL-CHANGE', data => {
            console.log(data)
            // getUserData(socket.id).data.monsterCount = 1
  	        console.log('saving user ' + getUserData(socket.id).data.username)
  	        getUserData(socket.id).data.level++
  	        console.log('New level is : ' + getUserData(socket.id).data.level)
             getUserData(socket.id).data.bossFight = data.isBoss
            console.log(getUserData(socket.id).data.level)
            if(getUserData(socket.id).data.level % 5 === 0)
            {
                console.log('Boss level')
                getUserData(socket.id).data.bossFight = true
                saveUser(getUserData(socket.id).data).then( returned => {
                    io.to(socket.id).emit('LEVEL-CHANGE', { 
                      monsterCount : 1,
                      goldCount : getUserData(socket.id).data.gold, 
                      level : getUserData(socket.id).data.level, 
                      username: getUserData(socket.id).data.username,
                      bossFight: getUserData(socket.id).data.bossFight
                    })  
                }).catch(e => console.log(e));
            } else {
                console.log('Regular level')
                getUserData(socket.id).data.bossFight = false
                saveUser(getUserData(socket.id).data).then( returned => {
                    io.to(socket.id).emit('LEVEL-CHANGE', { 
                      monsterCount : 1,
                      goldCount : getUserData(socket.id).data.gold, 
                      level : getUserData(socket.id).data.level, 
                      username: getUserData(socket.id).data.username,
                      bossFight: getUserData(socket.id).data.bossFight
                    })  
                }).catch(e => console.log(e));                
            }
    })
    socket.on('KILL-MONSTER', data => {
            console.log(data)
            if(!data.isBoss){
                if(getUserData(socket.id).data.monsterCount == 11){
                    getUserData(socket.id).data.monsterCount = 1
                }
                if(getUserData(socket.id).data.monsterCount < 11){
                    getUserData(socket.id).data.monsterCount++
                } else {
                getUserData(socket.id).data.monsterCount = 1
                }
            }
            if(getUserData(socket.id).data.bossKilled == false) {
                getUserData(socket.id).data.monsterCount = 10
            }

	    	    let amount =  Math.round(((data.monsterHP / 15) * Math.floor(((0 / 100) + 1))));
	    	    getUserData(socket.id).data.gold = getUserData(socket.id).data.gold + amount
	    	    console.log(`${getUserData(socket.id).data.username} killed a monster and earned ${amount} gold!`)
            saveUser(getUserData(socket.id).data).then( returned => {
  	    	      io.to(socket.id).emit('GOLD', { 
                    goldCount : getUserData(socket.id).data.gold,  
                    monsterCount:  getUserData(socket.id).data.monsterCount, 
                    socketId : socket.id, 
                    username: getUserData(socket.id).data.username,
                    isBoss: data.isBoss
                });
                setTimeout(() => { 
                  io.to(socket.id).emit('READY', { canAttack: true});
                  console.log('sending!')
                }, 1000);
            }).catch(e => console.log(e));
    })
    socket.on('disconnect', data => {
        currentUsers--;
        console.log('Player disconnected : ' + socket.id)
        console.log('Current Players: ' + currentUsers)
    })
});
let buyHero = (id, heroName, cost, socket) => new Promise((resolve, reject) => {
    console.log(id, heroName, cost, socket)
    User.findOne({ '_id' :  id }, function(err, user) {
        // if there are any errors, return the error
        if (err)
            reject(err)
        if (user) {
            if(user.heroes.length > 0) {
            let owned = user.heroes.filter(i => i.name == heroName)
            if(owned.length > 0){
                    console.log('user already owns hero!')
                   return reject(user)
            }}
            
            if(user.gold >= cost){
                var buyIndex = heroes.findIndex( slot => slot.name == heroName )
                if(buyIndex + 1 >= heroes.length) {
                    User.findOneAndUpdate({ '_id' :  id }, {$push: { 
                    heroes : heroes[buyIndex],
                    },
                    dps : user.dps + heroes[buyIndex].baseDps,
                    gold : user.gold - cost,
                    nextHero : {}
                }, {new: true}, (e, result) => {
                    if(e){
                            reject(e)
                        } else {
                            let res = getUserData(socket).data
                            console.log(result)
                             return resolve(result)
                        }
                })
                } else {
                    User.findOneAndUpdate({ '_id' :  id }, {$push: { 
                    heroes : heroes[buyIndex],
                    },
                    dps : user.dps + heroes[buyIndex].baseDps,
                    gold : user.gold - cost,
                    nextHero : heroes[buyIndex+1]
                    }, {new: true}, (e, result) => {
                        if(e){
                            reject(e)
                        } else {
                            console.log(result)
                            return resolve(result)
                        }
                        
                    })
                }
            }
             else {
                console.log('user has insufficient funds')
                 return reject(user)
            }
        }                      
    })
})
var heroes = [
      { name: 'Luna',
        fullImg: 'luna.jpg',
        headImg: 'luna-head.jpg',
        dps: 1,
        level: 1,
        baseDps: 1,
        baseCost: 10,
        cost: 10 },
      { name: 'Suyeon',
        fullImg: 'suyeon.jpg',
        headImg: 'suyeon-head.jpg',
        dps: 5,
        level: 1,
        baseDps: 5,
        baseCost: 49,
        cost: 49 },
      { name: 'Yukki',
        fullImg: 'yukki.jpg',
        headImg: 'yukki-head.jpg',
        dps: 19,
        level: 1,
        baseDps: 19,
        baseCost: 240,
        cost: 240 },
      { name: 'Mikon',
        fullImg: 'mikon.jpg',
        headImg: 'mikon-head.jpg',
        dps: 70,
        level: 1,
        baseDps: 70,
        baseCost: 1176,
        cost: 1176 },
      { name: 'Fate',
        fullImg: 'fate.jpg',
        headImg: 'fate-head.jpg',
        dps: 257,
        level: 1,
        baseDps: 257,
        baseCost: 5762,
        cost: 5762 },
      { name: 'Albedo',
        fullImg: 'albedo.jpg',
        headImg: 'albedo-head.jpg',
        dps: 941,
        level: 1,
        baseCost: 28234,
        baseDps: 28334,
        cost: 28234 },
      ]