const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  caja: { type: Number, required: true },
  debito: { type: Number, required: true },
  transferencias: { type: Number, required: true },
  agua: { type: Number, default: 0 },
  alquiler: { type: Number, default: 0 },
  sueldos: { type: Number, default: 0 },
  varios: { type: Number, default: 0 }
});

module.exports = mongoose.model('Venta', ventaSchema);
