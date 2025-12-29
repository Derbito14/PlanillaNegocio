const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Venta = require('../models/Venta');
const GastoProveedor = require('../models/GastoProveedor');

// =========================
// Crear nueva venta (UNA POR DÍA)
// =========================
router.post('/', async (req, res) => {
  try {
    const {
      fecha,
      caja,
      debito,
      transferencias,
      agua,
      alquiler,
      sueldos,
      varios
    } = req.body;

    if (!fecha) {
      return res.status(400).json({ message: 'La fecha es obligatoria' });
    }

    // Normalizar fecha (00:00)
    const fechaObj = new Date(fecha);
    fechaObj.setUTCHours(0, 0, 0, 0);

    // Validar que NO exista otra venta ese día
    const ventaExistente = await Venta.findOne({ fecha: fechaObj });
    if (ventaExistente) {
      return res.status(400).json({
        message: 'Ya existe una venta cargada para ese día'
      });
    }

    const nuevaVenta = new Venta({
      fecha: fechaObj,
      caja,
      debito,
      transferencias,
      agua,
      alquiler,
      sueldos,
      varios
    });

    const guardada = await nuevaVenta.save();
    res.status(201).json(guardada);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar la venta' });
  }
});

// =========================
// Obtener todas las ventas
// =========================
router.get('/', async (req, res) => {
  try {
    const ventas = await Venta.find().sort({ fecha: -1 });
    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
});

// =========================
// Eliminar venta Y sus gastos de proveedores
// =========================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de venta inválido' });
    }

    // 2️⃣ Buscar la venta
    const venta = await Venta.findById(id);
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const fechaVenta = venta.fecha;

    // 3️⃣ Borrar gastos de proveedores del MISMO DÍA
    await GastoProveedor.deleteMany({ fecha: fechaVenta });

    // 4️⃣ Borrar la venta
    await Venta.findByIdAndDelete(id);

    res.json({
      message: 'Venta y gastos de proveedores eliminados correctamente'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar venta' });
  }
});

module.exports = router;
