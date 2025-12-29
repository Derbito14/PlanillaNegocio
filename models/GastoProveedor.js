const mongoose = require('mongoose');

const gastoProveedorSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: true
  },

  proveedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor',
    required: true
  },

  // 🔹 referencia opcional a la venta
  // NO rompe registros viejos
  venta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venta',
    required: false,
    index: true
  },

  monto: {
    type: Number,
    required: true
  },

  tipo: {
    type: String,
    enum: ['EFECTIVO', 'TRANSFERENCIA'],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GastoProveedor', gastoProveedorSchema);
