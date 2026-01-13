const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Venta = require('../models/Venta');
const GastoProveedor = require('../models/GastoProveedor');

// ======================================
// Dashboard ventas + gastos por día
// ======================================
router.get('/', async (req, res) => {
  try {
    let { desde, hasta } = req.query;
    const hoy = new Date();

    if (!desde) desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    if (!hasta) hasta = desde;

    const desdeDate = new Date(`${desde}T00:00:00.000Z`);
    const hastaDate = new Date(`${hasta}T23:59:59.999Z`);

    const ventas = await Venta.find({ fecha: { $gte: desdeDate, $lte: hastaDate } }).sort({ fecha: -1 });
    const gastosProv = await GastoProveedor.find({ fecha: { $gte: desdeDate, $lte: hastaDate } }).populate('proveedor');

    const resumen = {};
    const fechaLocalStr = (fecha) => {
      const f = new Date(fecha);
      return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
    };

    ventas.forEach(v => {
      const dia = fechaLocalStr(v.fecha);
      resumen[dia] = {
        fecha: dia,
        _id: v._id,
        caja: v.caja || 0,
        debito: v.debito || 0,
        transferencias: v.transferencias || 0,
        ventaEfectivo: (v.caja || 0) + (v.agua || 0) + (v.alquiler || 0) + (v.sueldos || 0) + (v.varios || 0),
        ventaTotal: 0,
        proveedoresEfectivo: 0,
        proveedoresTransferencia: 0,
        proveedoresEfectivoSinAdelanto: 0,
        agua: v.agua || 0,
        alquiler: v.alquiler || 0,
        sueldos: v.sueldos || 0,
        varios: v.varios || 0
      };
    });

    gastosProv.forEach(g => {
      const dia = fechaLocalStr(g.fecha);
      if (!resumen[dia]) {
        resumen[dia] = {
          fecha: dia,
          _id: null,
          caja: 0,
          debito: 0,
          transferencias: 0,
          ventaEfectivo: 0,
          ventaTotal: 0,
          proveedoresEfectivo: 0,
          proveedoresTransferencia: 0,
          proveedoresEfectivoSinAdelanto: 0,
          agua: 0,
          alquiler: 0,
          sueldos: 0,
          varios: 0
        };
      }

      const esAdelantoCaja = g.proveedor?.esAdelantoCaja || false;

      if (g.tipo === 'EFECTIVO') {
        resumen[dia].proveedoresEfectivo += g.monto || 0;
        // Solo sumar al cálculo de venta efectivo si NO es "Adelanto caja"
        if (!esAdelantoCaja) {
          resumen[dia].proveedoresEfectivoSinAdelanto += g.monto || 0;
        }
      }
      if (g.tipo === 'TRANSFERENCIA') resumen[dia].proveedoresTransferencia += g.monto || 0;
    });

    const resumenFinal = Object.values(resumen).filter(r =>
      r.caja || r.debito || r.transferencias || r.ventaEfectivo ||
      r.proveedoresEfectivo || r.proveedoresTransferencia ||
      r.agua || r.alquiler || r.sueldos || r.varios
    );

    resumenFinal.forEach(r => {
      // Usar proveedoresEfectivoSinAdelanto para el cálculo de venta efectivo
      r.ventaEfectivo += r.proveedoresEfectivoSinAdelanto || 0;
      r.ventaTotal = (r.ventaEfectivo || 0) + (r.debito || 0) + (r.transferencias || 0);
    });

    res.json(resumenFinal.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error dashboard' });
  }
});

// ======================================
// Crear venta
// ======================================
router.post('/', async (req, res) => {
  try {
    const { fecha, caja, debito, transferencias, agua, alquiler, sueldos, varios } = req.body;

    const fechaDate = new Date(fecha);
    fechaDate.setUTCHours(0, 0, 0, 0);

    if (isNaN(fechaDate.getTime())) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const nuevaVenta = new Venta({
      fecha: fechaDate,
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

// ======================================
// Obtener ventas
// ======================================
router.get('/ventas', async (req, res) => {
  try {
    const ventas = await Venta.find().sort({ fecha: -1 });
    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
});

// ======================================
// ELIMINAR venta + gastos asociados
// ======================================
router.delete('/ventas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const venta = await Venta.findById(id);
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    // 🔥 borrar gastos asociados a la venta (FORMA CORRECTA)
    const borradosPorVenta = await GastoProveedor.deleteMany({
      venta: venta._id
    });

    await Venta.findByIdAndDelete(id);

    res.json({
      message: `Venta eliminada y ${borradosPorVenta.deletedCount} gastos borrados`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar venta' });
  }
});

// ======================================
// Balance de Caja Histórico Total
// ======================================
router.get('/balance-caja', async (req, res) => {
  try {
    // Obtener TODAS las ventas (sin filtro de fecha)
    const ventas = await Venta.find();

    // Obtener TODOS los gastos de proveedores (sin filtro de fecha)
    const gastosProv = await GastoProveedor.find().populate('proveedor');

    // Calcular total de ventas en efectivo (excluyendo adelanto caja)
    let totalVentasEfectivo = 0;

    ventas.forEach(v => {
      totalVentasEfectivo += (v.caja || 0) + (v.agua || 0) + (v.alquiler || 0) + (v.sueldos || 0) + (v.varios || 0);
    });

    // Sumar gastos de proveedores efectivo (excluyendo adelanto caja)
    gastosProv.forEach(g => {
      const esAdelantoCaja = g.proveedor?.esAdelantoCaja || false;
      if (g.tipo === 'EFECTIVO' && !esAdelantoCaja) {
        totalVentasEfectivo += g.monto || 0;
      }
    });

    // Calcular total de proveedores efectivo (INCLUYENDO adelanto caja)
    let totalProveedoresEfectivo = 0;

    gastosProv.forEach(g => {
      if (g.tipo === 'EFECTIVO') {
        totalProveedoresEfectivo += g.monto || 0;
      }
    });

    // Balance = Ventas Efectivo - Proveedores Efectivo
    const balanceCaja = totalVentasEfectivo - totalProveedoresEfectivo;

    res.json({
      totalVentasEfectivo,
      totalProveedoresEfectivo,
      balanceCaja
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al calcular balance de caja' });
  }
});

module.exports = router;
