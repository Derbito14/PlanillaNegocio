const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  esAdelantoCaja: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Proveedor', proveedorSchema);
