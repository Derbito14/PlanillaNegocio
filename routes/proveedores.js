const express = require('express');
const router = express.Router();
const Proveedor = require('../models/Proveedor');
const GastoProveedor = require('../models/GastoProveedor');

// ================================
// Inicializar "Adelanto caja" si no existe
// ================================
router.post('/init-adelanto-caja', async (req, res) => {
  try {
    const existe = await Proveedor.findOne({ esAdelantoCaja: true });

    if (existe) {
      return res.json({ message: 'Adelanto caja ya existe', proveedor: existe });
    }

    const adelantoCaja = new Proveedor({
      nombre: 'Adelanto caja',
      esAdelantoCaja: true
    });

    await adelantoCaja.save();
    res.status(201).json({ message: 'Adelanto caja creado', proveedor: adelantoCaja });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al inicializar Adelanto caja' });
  }
});

// ================================
// Obtener todos los proveedores
// ================================
router.get('/', async (req, res) => {
  try {
    const proveedores = await Proveedor.find().sort({ nombre: 1 });
    res.json(proveedores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener proveedores' });
  }
});

// ================================
// Crear proveedor nuevo
// ================================
router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const nuevoProveedor = new Proveedor({ nombre });
    const guardado = await nuevoProveedor.save();

    res.status(201).json(guardado);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'El proveedor ya existe' });
    }
    console.error(err);
    res.status(500).json({ message: 'Error al crear proveedor' });
  }
});

// ================================
// Eliminar proveedor (solo si NO tiene gastos)
// ================================
router.delete('/:id', async (req, res) => {
  try {
    const proveedorId = req.params.id;

    // Verificar si es "Adelanto caja" (protegido)
    const proveedor = await Proveedor.findById(proveedorId);
    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    if (proveedor.esAdelantoCaja) {
      return res.status(400).json({
        message: 'No se puede eliminar "Adelanto caja" porque es un proveedor protegido del sistema'
      });
    }

    const tieneGastos = await GastoProveedor.exists({ proveedor: proveedorId });
    if (tieneGastos) {
      return res.status(400).json({
        message: 'No se puede eliminar el proveedor porque tiene registros'
      });
    }

    await Proveedor.findByIdAndDelete(proveedorId);
    res.json({ message: 'Proveedor eliminado correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar proveedor' });
  }
});

// ================================
// Crear gasto de proveedor (POR FECHA)
// ================================
router.post('/gastos', async (req, res) => {
  try {
    let { fecha, proveedor, monto, tipo } = req.body;

    if (!fecha || !proveedor || !monto || !tipo) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    tipo = tipo.toUpperCase();

    const fechaObj = new Date(fecha);
    fechaObj.setUTCHours(0, 0, 0, 0);

    if (isNaN(fechaObj.getTime())) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const nuevoGasto = new GastoProveedor({
      fecha: fechaObj,
      proveedor,
      monto,
      tipo
    });

    await nuevoGasto.save();

    res.status(201).json({ message: 'Gasto guardado correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar gasto' });
  }
});

// ================================
// Obtener todos los gastos de proveedores
// ================================
router.get('/gastos', async (req, res) => {
  try {
    const gastos = await GastoProveedor.find()
      .populate('proveedor')
      .sort({ fecha: -1 });

    res.json(gastos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener gastos' });
  }
});

// ================================
// Dashboard de proveedores (gastos por día y por proveedor)
// ================================
router.get('/dashboard', async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      return res.status(400).json({ message: 'Faltan fechas' });
    }

    const desdeObj = new Date(desde);
    const hastaObj = new Date(hasta);
    hastaObj.setUTCHours(23, 59, 59, 999);

    // Traer todos los gastos en el rango
    const gastos = await GastoProveedor.find({
      fecha: { $gte: desdeObj, $lte: hastaObj }
    }).populate('proveedor');

    // Agrupar por fecha y por proveedor
    const dashboardMap = {};

    gastos.forEach(g => {
      const fechaStr = g.fecha.toISOString().split('T')[0]; // YYYY-MM-DD
      const proveedorNombre = g.proveedor?.nombre || 'Sin proveedor';

      if (!dashboardMap[fechaStr]) {
        dashboardMap[fechaStr] = {
          fecha: fechaStr,
          proveedores: {},
          totalEfectivo: 0,
          totalTransferencia: 0
        };
      }

      if (!dashboardMap[fechaStr].proveedores[proveedorNombre]) {
        dashboardMap[fechaStr].proveedores[proveedorNombre] = {
          efectivo: 0,
          transferencia: 0
        };
      }

      if (g.tipo === 'EFECTIVO') {
        dashboardMap[fechaStr].proveedores[proveedorNombre].efectivo += g.monto;
        dashboardMap[fechaStr].totalEfectivo += g.monto;
      } else if (g.tipo === 'TRANSFERENCIA') {
        dashboardMap[fechaStr].proveedores[proveedorNombre].transferencia += g.monto;
        dashboardMap[fechaStr].totalTransferencia += g.monto;
      }
    });

    // Convertir a array ordenado por fecha ascendente
    const resultado = Object.values(dashboardMap).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    res.json(resultado);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al generar dashboard' });
  }
});

module.exports = router;
