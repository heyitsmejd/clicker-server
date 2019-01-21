const mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
const Schema = mongoose.Schema;
let userSchema = new Schema({
    username: {type: String, required: true, max: 30},
    email: {type: String, required: true},
    password: {type: String, required: true},
    currentLevel: {type: Number},
    heroes: {type: mongoose.Mixed, default: []},
    nextHero: {type: mongoose.Mixed, default: {}},
    gold: {type: Number, default: 0},
    goldBonus: {type: Number, default: 0},
    level: {type: Number, default: 1}, 
    monsterCount: {type: Number, default: 1},
    clickCount: {type: Number, default: 0},
    dps: {type: Number, default: 0},
    dpc: {type: Number, default: 1},
    dpsBonus: {type: Number, default: 0},
    dpcBonus: {type: Number, default: 0},
    reborns: {type: Number, default: 0},
    achievements: {type: mongoose.Mixed, default: []},
    socketId: {type: String, default: 0}
},{ minimize: false });

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};
// Export the model
module.exports = mongoose.model('User', userSchema);