// routes/auth.js
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario'); // tu modelo Usuario.js
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ message: 'Faltan campos' });
    }

    // Buscamos usuario en la DB
    const user = await Usuario.findOne({ usuario, password }); // plain text solo prueba

    if (!user) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrecta' });
    }

    // Generamos token JWT real
    const token = jwt.sign(
      { id: user._id, usuario: user.usuario },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Error en /login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
