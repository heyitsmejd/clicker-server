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
var expressSession = require("express-session");
var sessionMiddleware = expressSession({
    name: "testing",
    secret: "testing",
    store: new (require("connect-mongo")(expressSession))({
        url: "mongodb://localhost/clicker"
    })
});
app.use(sessionMiddleware);

const io = require('socket.io')(server).use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});
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
app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested With, Content-Type, Accept');
   req.io = io;
   next();
});
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
app.use(passport.initialize());
app.use(passport.session());
var User = require('./models/User');
var Heroes = require('./models/Heroes');
var Monster = require('./models/Monster');
var ItemDb = require('./models/ItemDb');
Monster.initialize();
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    passport.serializeUser(function(user, done) {
        done(null, user._id);
});
mongoose.set('useFindAndModify', false);
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
app.post('/api/register', (req, res) => {
	createNewUser(req.body).then((returned) => {
			res.send(req.body.username)
	}).catch(e => {
        console.log(e)		
	})
})
var username;
app.post('/api/login', (req,res,next) => {
        passport.authenticate('local', function(err, user, info ) {
            if (err) {
                 res.status(401).send("Invalid username or password.");
            return next(err); 
            }
            if (!user) {
                res.status(401).send("Invalid username or password.");
            } else {  
                req.logIn(user, function(err) {
                 if (err) { return res.send(err); }
                 username = user.username
               // console.log(user.username + ' logged in')
                res.json('ok')
              });

            }
        })(req, res, next); 
     });
app.get('/', (req,res) => {
	// res.send('Please login or register.')
})
app.get('/start', (req, res) => {
  res.send('ok')
})
const createNewUser = (userInfo) => {
    var promise = new Promise((resolve, reject) => {
        User.findOne({ 'username' :  userInfo.username }, function(err, user) {
            // if there are any errors, return the error
            if (err)
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
    			newUser.save(function(error, result) {
                    resolve(result)
                })
            }                      
        })
    })
    return promise
}
var userData = [];
const getUserData = (socket) => {
  return userData.find(i => i.socketId == socket)
}
const getUserHeroData = (id) => {

}
const saveUser = (user) => {
    var promise = new Promise((resolve, reject) => {
        // if(user.level % 5 == 0){
        //     user.level--
        //     user.monsterCount = 10
        // }
        User.findOneAndUpdate({_id : user.id}, {
            $set: {
                level : user.level,
                gold : user.gold,
                monsterCount : user.monsterCount,
                inventory : user.inventory,
                goldBonus : user.goldBonus,
                bossFight: user.bossfight,
                dps : user.dps,
                dpc : user.dpc,
                equippedWeapon : user.equippedWeapon,
                equippedAmulet : user.equippedAmulet,
                equippedRing : user.equippedRing,
                equippedScroll : user.equippedScroll,
                heroes : user.heroes,
                failedBoss : user.failedBoss,
               // reborns : user.reborns
            }}, (err, user) => {
            resolve(user)
        })
    })
    return promise 
}

const getLevelCost = (user, hero) => {
      let totalLevelCost = 0;
      let startingLevel = hero.level;
      let endLevel = hero.level + user.levelRate;
      for (let i = startingLevel; i < endLevel; i++)
      {
          if(i > 25)
          {
            totalLevelCost = totalLevelCost + Math.round(hero.baseCost * (Math.pow(1.07525,i)))
          } else {
              totalLevelCost = totalLevelCost + Math.round(hero.baseCost * (Math.pow(1.06975,i)))
          }
      }
      return totalLevelCost
}

let currentUsers = 0;
let activeUsers = []
io.on('connection', function(socket) {
    currentUsers++; 
    activeUsers.push({ id: socket.id, username: null })
    userData.push({socketId : socket.id, connected: true})
    socket.on('CheckUser', data => { //TODO: not send all user data, only relevant one.
        activeUsers.forEach(i => {
            if(i.username == username){
                io.to(i.id).emit('disconnect')
                io.to(i.id).emit('LOGGED-IN-ELSEWHERE', data => {
                    message: `You've been logged in from somewhere else`
                })
                console.log('user was already logged in, disconnecting previous.')
            }
        })
        User.findOne({ username : username}, function(err, user) {
            let findUser = activeUsers.find(i => i.id == socket.id)
            findUser.username = username
            var pushUser = user
            pushUser.password = undefined
            pushUser.email = undefined
            getUserData(socket.id).data = pushUser
            if(getUserData(socket.id).data.monsterCount > 10){
                getUserData(socket.id).data.monsterCount = 10
            }
            getUserData(socket.id).data.canLoot = true
             getUserData(socket.id).data.failedBoss = null
            // getUserData(socket.id).data.nextHero = heroes[(getUserData(socket.id).data.heroes.length + 1)]
            getNewMonster(socket.id).then(() => {
            io.to(socket.id).emit('LOGIN', getUserData(socket.id).data)
            setTimeout(() => { 
                  io.to(socket.id).emit('READY', { canAttack: true});
                    getUserData(socket.id).data.canAttack = true
                    startAutoDPS(socket)
                    if(getUserData(socket.id).data.level % 5 == 0){
                        startBossTimer(socket)
                    }
                  
            }, 1000);


            })

        });
    })
	  socket.on('DAMAGE', data => {
        var amount = getUserData(socket.id).data.dpc
        
        if((getUserData(socket.id).data.currentMonster.monsterCurrentHP -  amount ) <= 0) {
            amount = getUserData(socket.id).data.currentMonster.monsterCurrentHP;
            killMonster(socket)
        } else {
            getUserData(socket.id).data.currentMonster.monsterCurrentHP = getUserData(socket.id).data.currentMonster.monsterCurrentHP - amount
        }
        
	    	io.to(socket.id).emit('ATTACK', { monsterCurrentHP : getUserData(socket.id).data.currentMonster.monsterCurrentHP })
    })
    socket.on('EQUIP', data => {
        if(data.itemType == 0){
            if(getUserData(socket.id).data.equippedWeapon.name){ //if equipped weapon exists, remove DPC bonus from it.
                getUserData(socket.id).data.inventory.push(getUserData(socket.id).data.equippedWeapon)
                getUserData(socket.id).data.dpc = getUserData(socket.id).data.dpc - getUserData(socket.id).data.equippedWeapon.bonusAmount
                getUserData(socket.id).data.equippedWeapon = {}
            }
            let equipItem =  getUserData(socket.id).data.inventory.find(i => i.id === data.id)
            let fileteredInv =  getUserData(socket.id).data.inventory.filter(i => i.id != data.id)
            getUserData(socket.id).data.dpc = getUserData(socket.id).data.dpc + equipItem.bonusAmount
            getUserData(socket.id).data.equippedWeapon = equipItem
            getUserData(socket.id).data.inventory = fileteredInv // So we remove it from inventory after adding it to Equipped slot.
            // then emit socket... and update DPC on client side... save user.
            saveUser(getUserData(socket.id).data).then( returned => {
                io.to(socket.id).emit('EQUIPPED', { 
                    equippedWeapon : getUserData(socket.id).data.equippedWeapon, 
                    inventory : getUserData(socket.id).data.inventory,
                    dpc : getUserData(socket.id).data.dpc
                })
            }).catch(e => console.log(e));    
        }
        if(data.itemType == 2){
            if(getUserData(socket.id).data.equippedRing.name){ //if equipped weapon exists, remove DPC bonus from it.
                getUserData(socket.id).data.inventory.push(getUserData(socket.id).data.equippedRing)
                getUserData(socket.id).data.goldBonus = getUserData(socket.id).data.goldBonus - getUserData(socket.id).data.equippedRing.bonusAmount
                getUserData(socket.id).data.equippedRing = {}
            }
            let equipItem =  getUserData(socket.id).data.inventory.find(i => i.id === data.id)
            let fileteredInv =  getUserData(socket.id).data.inventory.filter(i => i.id != data.id)
            getUserData(socket.id).data.goldBonus = getUserData(socket.id).data.goldBonus + equipItem.bonusAmount
            getUserData(socket.id).data.equippedRing = equipItem
            getUserData(socket.id).data.inventory = fileteredInv // So we remove it from inventory after adding it to Equipped slot.
            // then emit socket... and update DPC on client side... save user.
            saveUser(getUserData(socket.id).data).then( returned => {
                io.to(socket.id).emit('EQUIPPED', { 
                    equippedRing : getUserData(socket.id).data.equippedRing, 
                    inventory : getUserData(socket.id).data.inventory,
                    goldBonus : getUserData(socket.id).data.goldBonus
                })
            }).catch(e => console.log(e));    
        }
    })
    socket.on('LEVEL-CHAR', data => {
        let user = getUserData(socket.id).data
        let levelingHero = user.heroes.find(slot => slot.name == data.name)
        let initialCost = levelingHero.baseCost
        let totalLevelCost = getLevelCost(user, levelingHero);
        let endLevel = levelingHero.level + user.levelRate;
            if(user.gold >= totalLevelCost)
            {
              user.gold = user.gold - totalLevelCost
              levelingHero.level = endLevel;
              levelingHero.cost = Math.round(initialCost * (1.07 * levelingHero.level))
              //Update all heroes dps and return to user
              let totalDps = 0
              user.heroes.forEach(i => {
                i.dps = i.baseDps * i.level
                totalDps = totalDps + i.dps
              })
              user.dps = totalDps
              io.to(socket.id).emit('LEVEL-CHAR', { hero : levelingHero, dps : totalDps, goldCount : user.gold })
            }    
    })
    socket.on('LEVEL-RATE', data => { //Unused for now.
        getUserData(socket.id).data.levelRate = data.levelRate
    })
    socket.on('LOGIN', data => { //Unused for now.

    })
    socket.on('BOSS-END', data => { //Unused for now.
        // Check if boss killed before time ended
        // if(getUserData(socket.id).data.currentMonster.monsterCurrentHP > 0){
        //     getUserData(socket.id).data.bossKilled = false
        //     if(getUserData(socket.id).data.level % 5 == 0){
        //          getUserData(socket.id).data.failedBoss = getUserData(socket.id).data.level
        //          getUserData(socket.id).data.level--
        //     }
        //     getNewMonster(socket.id).then(() => {

        //          getUserData(socket.id).data.bossFight = false
        //         saveUser(getUserData(socket.id).data).then( returned => {
        //             io.to(socket.id).emit('DOWN-LEVEL', { 
        //               monsterCount : 9,
        //               level : getUserData(socket.id).data.level, 
        //               bossKilled: getUserData(socket.id).data.bossKilled,
        //               currentMonster : getUserData(socket.id).data.currentMonster
        //             })  
        //         }).catch(e => console.log(e)); 
        //     }) 
           
        // }
        // if(getUserData(socket.id).data.currentMonster.monsterCurrentHP <= 0){
        //     getUserData(socket.id).data.failedBoss = false;
        // }
        // If not, repeat previous round at 10/10... Have button shown to go back to boss.

        // If so, go to new round, change mons count to 1/10 and start new level.
        // if(data.bossHP <= 0){

        // }
    })
    socket.on('BUY-CHAR', data => {
     var buyingHero = heroes.find( slot => slot.name == data.name )
        buyHero(getUserData(socket.id).data._id, buyingHero.name, buyingHero.baseCost, socket.id).then(res => {
            getUserData(socket.id).data.dps = res.dps
            getUserData(socket.id).data.heroes = res.heroes
            getUserData(socket.id).data.gold = res.gold
            io.to(socket.id).emit('BUY-CHAR', { bought : res.heroes, next: res.nextHero, gold: res.gold, dps : res.dps })
            
        }).catch(e => {
            //This should only happen if the user has the Hero
            console.log(e)
        })
     })
    socket.on('RESTART-BOSS', data => {

        if(getUserData(socket.id).data.failedBoss){
            getUserData(socket.id).data.bossFight = true
            startBossTimer(socket)
            getUserData(socket.id).data.level = getUserData(socket.id).data.failedBoss
            getUserData(socket.id).data.failedBoss = null;
            getNewMonster(socket.id).then(() => {
                    io.to(socket.id).emit('LEVEL-CHANGE', { 
                      monsterCount : 1,
                      level : getUserData(socket.id).data.level, 
                      bossFight: getUserData(socket.id).data.bossFight,
                      currentMonster: getUserData(socket.id).data.currentMonster
                    })   
            })
            
        }
    })

    socket.on('disconnect', data => {
        currentUsers--;
        console.log(getUserData(socket.id))
        getUserData(socket.id).connected = false
        if(getUserData(socket.id).data){
            console.log('saving user')
            saveUser(getUserData(socket.id).data).then(() => {
                console.log('Player disconnected : ' + getUserData(socket.id).data.username)
            })
        }
        let findUser = activeUsers.findIndex(i => i.id == socket.id)
        activeUsers.splice(findUser,1)
        console.log('Current Players: ' + currentUsers)
    })
});
const startBossTimer = (socket) => {
            getUserData(socket.id).data.bossFight = true;
            console.log('starting boss timer...')
            var endTime = new Date(); 
            endTime = new Date(endTime .getTime() + 30000);
            var interval = setInterval(function() {
                    var now = new Date();
                    var distance = endTime - now;
                    if(distance < 0)
                    {
                        distance = 0
                    }
                    io.to(socket.id).emit('BOSS-TIMER', { currentTime : (distance / 1000).toFixed(2)});   
                    if(!getUserData(socket.id).data.bossFight) {

                        console.log('boss fight is over')
                        // document.getElementById("boss-timer").innerHTML = "";
                        
                        clearInterval(interval)
                    }
                    else if(now > endTime)
                    {
                        failedBoss(socket)
                        console.log('times up, user failed.')
                        // document.getElementById("boss-timer").innerHTML = "";
                        clearInterval(interval)
                        // self.socket.emit('BOSS-END', {
                        //  bossHP: self.monsterCurrentHP,
                        //  bossKilled: self.bossKilled,
                        // })
                    }
            }, 100);
}
const getNewMonster = (id) => {
    var promise = new Promise((resolve, reject) => {
        let currentLevelMon =  Monster.levels.find(level => level.level ==  getUserData(id).data.level)
        getUserData(id).data.currentMonster = currentLevelMon.list.find((i, index) => index == (getUserData(id).data.monsterCount)) 
        // Create monster HP based on levels.
        getUserData(id).data.currentMonster.monsterCurrentHP = Math.round(10 * ((getUserData(id).data.level-1) + Math.pow(1.55, getUserData(id).data.level - 1)))
        getUserData(id).data.currentMonster.monsterMaxHP = Math.round(10 * ((getUserData(id).data.level-1) + Math.pow(1.55, getUserData(id).data.level - 1)))
        if(getUserData(id).data.level % 5 === 0)
        {
            // this.startBossTimer()
            getUserData(id).data.bossKilled = false;
            getUserData(id).data.currentMonster.monsterCurrentHP = Math.round(10 * ((getUserData(id).data.level-1) + Math.pow(1.55, getUserData(id).data.level)) * 10)
            getUserData(id).data.currentMonster.monsterMaxHP = Math.round(10 * ((getUserData(id).data.level-1) + Math.pow(1.55, getUserData(id).data.level)) * 10)
        }
        resolve(getUserData(id).data.currentMonster)
    })
    return promise
}
const startAutoDPS = (socket) => {
        function auto() {
            if(!getUserData(socket.id).connected){
                return
            }
            if(getUserData(socket.id).data.currentMonster.monsterCurrentHP > 0 && getUserData(socket.id).data.canAttack) {
                getUserData(socket.id).data.currentMonster.monsterCurrentHP = getUserData(socket.id).data.currentMonster.monsterCurrentHP - getUserData(socket.id).data.dps
                io.to(socket.id).emit('ATTACK', { monsterCurrentHP : getUserData(socket.id).data.currentMonster.monsterCurrentHP});    
            }
            if(getUserData(socket.id).data.currentMonster.monsterCurrentHP <= 0){
                killMonster(socket)

            }
            setTimeout(() => auto(), 1000)
        }  
        setTimeout(() => auto(), 100)
}
/// TODO CHANGE LEVEL
const nextLevel = (socket) => {
            getUserData(socket.id).data.level++
            //Emit Level Change.
            io.to(socket.id).emit('LEVEL-CHANGE', { 
                      monsterCount : 0,
                      goldCount : getUserData(socket.id).data.gold, 
                      level : getUserData(socket.id).data.level, 
                      username: getUserData(socket.id).data.username,
                      bossFight: getUserData(socket.id).data.bossFight,
            })  
            if(getUserData(socket.id).data.level % 5 == 0)
            {
                getUserData(socket.id).data.monsterCount = 0
                console.log('Boss level')
                getUserData(socket.id).data.bossFight = true
                //Start Boss timer
                startBossTimer(socket)
                //Emit Boss timer Socket.
            } else {
                getUserData(socket.id).data.monsterCount = 0
                console.log('Regular level')
                getUserData(socket.id).data.bossFight = false            
            }
}
const failedBoss = (socket) => {
    getUserData(socket.id).data.failedBoss = getUserData(socket.id).data.level
    //Lower level
    getUserData(socket.id).data.level--
    //Set Monsters to 9, don't auto level.
    getUserData(socket.id).data.monsterCount = 10
    getNewMonster(socket.id).then(() => {
            io.to(socket.id).emit('DOWN-LEVEL', { 
                      monsterCount : 10,
                      level : getUserData(socket.id).data.level, 
                      currentMonster : getUserData(socket.id).data.currentMonster,
                      username: getUserData(socket.id).data.username,
                      bossFight: false,
            }) 
    })

    //Enable Return to boss button
}
const checkBossKill = (socket) => {
    if(getUserData(socket.id).data.currentMonster.monsterCurrentHP > 0){
        //User failed to kill boss. Downlevel him.
        console.log('user failed to kill boss.')
        failedBoss(socket)
    } else if (getUserData(socket.id).data.currentMonster <= 0){
        //User killed the boss.
        console.log('user killed boss!')
        killMonster(socket)
        //Clear timers
    }
}
const killMonster = (socket) => {
        if(getUserData(socket.id).data.bossFight){
            // User killed the boss reset to false.
            getUserData(socket.id).data.bossFight = false

            getUserData(socket.id).data.monsterCount = 10
        }
        getUserData(socket.id).data.canLoot = false
        getUserData(socket.id).data.canAttack = false;
            if(getUserData(socket.id).data.currentMonster.hasDrop){
                let dropItems = getUserData(socket.id).data.currentMonster.hasDrop
                let itemDrops = []
                if(dropItems.length > 0){
                dropItems.forEach(i => {
                    let item = ItemDb.items.find(x => i == x.id)
                    let roll = Math.floor(Math.random() * 101);
                    if(roll <= item.chance){
                        itemDrops.push(item)
                        getUserData(socket.id).data.inventory.push(item)
                    }
                })}
                if(itemDrops.length > 0){
                    io.to(socket.id).emit('ITEM-DROP', {
                        inventory : getUserData(socket.id).data.inventory,
                        itemDrops : itemDrops
                    })
                }
            }
            if(getUserData(socket.id).data.monsterCount < 10 ){
                    getUserData(socket.id).data.monsterCount++
            } 
            if(getUserData(socket.id).data.monsterCount == 10 && !getUserData(socket.id).data.failedBoss){
                   nextLevel(socket)
            }
                let amount =  Math.round(((getUserData(socket.id).data.currentMonster.monsterMaxHP / 15) * Math.floor(((0 / 100) + 1))));
                if(getUserData(socket.id).data.goldBonus > 0){
                  amount = Math.round(amount * getUserData(socket.id).data.goldBonus)
                }
                getUserData(socket.id).data.gold = getUserData(socket.id).data.gold + amount 
                getNewMonster(socket.id).then(() => {
                    saveUser(getUserData(socket.id).data).then( returned => {
                        io.to(socket.id).emit('GOLD', { 
                        goldCount : getUserData(socket.id).data.gold,  
                        monsterCount:  getUserData(socket.id).data.monsterCount, 
                        socketId : socket.id, 
                        username: getUserData(socket.id).data.username,
                        currentMonster : getUserData(socket.id).data.currentMonster
                });
                setTimeout(() => { 
                    getUserData(socket.id).data.canLoot = true
                  io.to(socket.id).emit('READY', { canAttack: true});
                  getUserData(socket.id).data.canAttack = true;
                }, 2000);
            }).catch(e => console.log(e));
    })
}
const buyHero = (id, heroName, cost, socket) => {
    var promise = new Promise((resolve, reject) => {
        User.findOne({ '_id' :  id }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                reject(err)
            if (user) {
                if(user.heroes.length > 0) {
                let owned = user.heroes.filter(i => i.name == heroName)
                if(owned.length > 0){ //user owns hero
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
                                let res = getUserData(socket).data
                                return resolve(result)
                            }
                            
                        })
                    }
                }
                 else {  //Not enough gold to buy
                     return reject(user)
                }
            }                      
        })
    })
 return promise
}
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
        baseDps: 941,
        cost: 28234 },
        { name: 'Kayle',
        fullImg: 'albedo.jpg',
        headImg: 'kayle-head.jpg',
        dps: 3444,
        level: 1,
        baseCost: 138346,
        baseDps: 3444,
        cost: 138346 },
        { name: 'Rie',
        fullImg: 'albedo.jpg',
        headImg: 'rie-head.jpg',
        dps: 12605,
        level: 1,
        baseCost: 677895,
        baseDps: 12605,
        cost: 677895 },
        { name: 'Nell',
        fullImg: 'albedo.jpg',
        headImg: 'nell-head.jpg',
        dps: 46134,
        level: 1,
        baseCost: 3321685,
        baseDps: 46134,
        cost: 3321685 },
      ]