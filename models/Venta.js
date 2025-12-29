const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  caja: { type: Number, required: true },
  debito: { type: Number, required: true },
  transferencias: { type: Number, required: true },
  agua: { type: Number, required: true },
  alquiler: { type: Number, required: true },
  sueldos: { type: Number, required: true },
  varios: { type: Number, required: true }
});

module.exports = mongoose.model('Venta', ventaSchema);
