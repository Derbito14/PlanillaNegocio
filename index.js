// index.js
const express = require('express');
const cors = require('cors'); 
const mongoose = require('mongoose');
require('dotenv').config(); // carga las variables del .env

const authRoutes = require('./routes/auth');
const ventasRoutes = require('./routes/ventas'); // <-- ruta de ventas
const proveedoresRoutes = require('./routes/proveedores'); // <-- ✅ NUEVO
const dashboardRoutes = require('./routes/dashboard');


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ================================
// Conexión a MongoDB Atlas
// ================================
const mongoUri = process.env.MONGO_URI;

// Verificamos si la variable se está leyendo
if (!mongoUri) {
  console.error('❌ Error: MONGO_URI no está definido. Revisá tu .env');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB conectado correctamente'))
  .catch(err => {
    console.error('❌ Error al conectar MongoDB', err);
    process.exit(1); // salimos del proceso si no se conecta
  });

// ================================
// Rutas
// ================================
app.use('/api', authRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/proveedores', proveedoresRoutes); // <-- ✅ NUEVO
app.use('/api/dashboard', dashboardRoutes);


app.get('/', (req, res) => {
  res.send('Backend funcionando correctamente 👌');
});

// ================================
// Servidor
// ================================
app.listen(3001, () => {
  console.log('🚀 Backend escuchando en puerto 3001');
});
