const mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
const Schema = mongoose.Schema;
let userSchema = new Schema({
    username: {type: String, required: true, max: 30},
    email: {type: String, required: true},
    password: {type: String, required: true},
    currentLevel: {type: Number},
    heroes: {type: mongoose.Mixed},
    gold: {type: Number},
    goldBonus: {type: Number},
    clickCount: {type: Number},
    dps: {type: Number},
    dpc: {type: Number},
    dpsBonus: {type: Number},
    dpcBonus: {type: Number},
    reborns: {type: Number},
    achievements: {type: mongoose.Mixed},
    socketId: {type: String}
});

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