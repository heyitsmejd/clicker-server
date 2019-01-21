const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let heroesSchema = new Schema({
    bought: {type: mongoose.Mixed, default: []},
    next: {type: mongoose.Mixed},
    uid: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
},{ minimize: false });

// methods ======================

// Export the model
module.exports = mongoose.model('Heroes', heroesSchema);