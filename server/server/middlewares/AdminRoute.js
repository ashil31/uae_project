import jwt from 'jsonwebtoken';

const AdminRoute = async (req, res, next) => {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No valid token provided" });
    }
    const token = authHeader.replace('Bearer ', ''); 
    
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    // 4. Attach user to request
    req.user = decoded;

    
    next();
  } catch (error) {  
    console.error('Admin auth error:', error);
    return res.status(403).json({ 
      message: "Admin access denied",
      error: error.message 
    });
  }
};

export default AdminRoute;