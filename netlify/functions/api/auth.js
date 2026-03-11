const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../server/db/database');

// Use service role client for registration (bypasses RLS)
const insforge = db.serviceRole;

const SECRET = process.env.JWT_SECRET || 'super_secret_guardian_shield_key_2026';

exports.handler = async (event, context) => {
  const { httpMethod, path, body } = event;

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (path.endsWith('/register') && httpMethod === 'POST') {
      const { name, email, phone, password } = JSON.parse(body);
      if (!name || !email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Validation Error: Required fields missing' })
        };
      }

      const hash = await bcrypt.hash(password, 10);
      const { data, error } = await insforge.database
        .from('users')
        .insert({ name, email, phone: phone || null, password_hash: hash })
        .select();

      if (error) {
        console.error('InsForge register error:', JSON.stringify(error));
        const msg = error.message || error.hint || JSON.stringify(error);
        if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Email or phone already registered' })
          };
        }
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Registration failed: ' + msg })
        };
      }

      if (!data || !data.length) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Registration failed: No data returned' })
        };
      }

      const id = data[0].id;
      const token = jwt.sign({ id, email }, SECRET, { expiresIn: '7d' });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ token, user: { id, name, email } })
      };
    }

    if (path.endsWith('/login') && httpMethod === 'POST') {
      const { email, password } = JSON.parse(body);
      
      const { data, error } = await insforge.database
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid credentials' })
        };
      }

      const user = data;
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid credentials' })
        };
      }

      const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ token, user: { id: user.id, name: user.name, email: user.email } })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint not found' })
    };
  } catch (err) {
    console.error('Auth function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};
