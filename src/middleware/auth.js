const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthMiddleware {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.adminUsers = [
      {
        username: 'admin',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin123
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin']
      },
      {
        username: 'moderator',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: mod123
        role: 'moderator',
        permissions: ['read', 'write']
      }
    ];
  }

  // Gerar hash da senha
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verificar senha
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Gerar token JWT
  generateToken(user) {
    const payload = {
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  // Verificar token JWT
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  // Middleware de autenticação
  authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.adminToken ||
                  req.session?.adminToken;

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso requerido',
        redirect: '/admin/login'
      });
    }

    const decoded = this.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Token inválido ou expirado',
        redirect: '/admin/login'
      });
    }

    req.user = decoded;
    next();
  }

  // Middleware de autorização
  authorize(permissions = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const hasPermission = permissions.some(permission => 
        req.user.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Permissão insuficiente',
          required: permissions,
          userPermissions: req.user.permissions
        });
      }

      next();
    };
  }

  // Login do administrador
  async login(username, password) {
    const user = this.adminUsers.find(u => u.username === username);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Senha incorreta');
    }

    const token = this.generateToken(user);
    
    return {
      token,
      user: {
        username: user.username,
        role: user.role,
        permissions: user.permissions
      }
    };
  }

  // Logout
  logout(res) {
    res.clearCookie('adminToken');
    return { message: 'Logout realizado com sucesso' };
  }

  // Verificar se usuário está logado
  isAuthenticated(req) {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.adminToken ||
                  req.session?.adminToken;

    if (!token) return false;

    const decoded = this.verifyToken(token);
    return decoded ? true : false;
  }

  // Rate limiting para login
  loginAttempts = new Map();

  checkLoginAttempts(ip) {
    const attempts = this.loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    // Reset attempts after 15 minutes
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      attempts.count = 0;
    }
    
    return attempts;
  }

  recordLoginAttempt(ip, success) {
    const attempts = this.loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    if (success) {
      attempts.count = 0;
    } else {
      attempts.count++;
    }
    
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(ip, attempts);
  }

  // Middleware de rate limiting para login
  loginRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const attempts = this.checkLoginAttempts(ip);
    
    if (attempts.count >= 5) {
      return res.status(429).json({
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        retryAfter: 15 * 60
      });
    }
    
    next();
  }

  // Middleware de segurança adicional
  securityHeaders(req, res, next) {
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevenir MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; " +
      "connect-src 'self';"
    );
    
    next();
  }

  // Log de atividades administrativas
  logAdminActivity(req, action, details = {}) {
    const log = {
      timestamp: new Date().toISOString(),
      username: req.user?.username,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      action: action,
      details: details
    };
    
    console.log('🔐 Admin Activity:', JSON.stringify(log, null, 2));
    
    // Aqui você pode salvar no banco de dados se necessário
    // database.saveAdminLog(log);
  }

  // Middleware para log de atividades
  activityLogger(action) {
    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Log apenas se a resposta foi bem-sucedida
        if (res.statusCode >= 200 && res.statusCode < 300) {
          authMiddleware.logAdminActivity(req, action, {
            statusCode: res.statusCode,
            responseSize: data ? data.length : 0
          });
        }
        
        originalSend.call(this, data);
      };
      
      next();
    };
  }
}

const authMiddleware = new AuthMiddleware();

module.exports = authMiddleware;
