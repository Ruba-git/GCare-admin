// API Client Logic
import { supabase } from './supabaseClient';

// Helper to map Supabase snake_case to React camelCase
const mapUser = (u) => {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.full_name || u.fullName,
    serviceLocation: u.service_location || u.serviceLocation,
    latitude: u.latitude,
    longitude: u.longitude,
    status: u.status,
    createdAt: u.created_at
  };
};

// Helper to verify passwords (supports both plain text and salt:hash format from the old backend)
const verifyPassword = async (password, stored) => {
  if (!stored || !stored.includes(':')) return password === stored;
  
  try {
    const [salt, storedHash] = stored.split(':');
    const encoder = new TextEncoder();
    const saltData = encoder.encode(salt);
    const passwordData = encoder.encode(password);
    
    const key = await crypto.subtle.importKey(
      'raw', 
      saltData, 
      { name: 'HMAC', hash: 'SHA-256' }, 
      false, 
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, passwordData);
    const hashHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
      
    return hashHex === storedHash;
  } catch (e) {
    console.error("Password verification error:", e);
    return false;
  }
};

export const mockLogin = async (email, password) => {
  // Hardcoded Admin Fallback (matching server.js credentials)
  if (email.toLowerCase() === 'ganesanadmin@gmail.com' && password === 'Gcare$321') {
    return {
      user: {
        id: 1,
        email: 'ganesanadmin@gmail.com',
        role: 'admin',
        fullName: 'Super Admin',
        status: 'approved'
      }
    };
  }

  // Fetch user from Supabase users table - using ilike for case-insensitivity
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .single();

  if (error || !data) {
    console.error('Login error (user not found or multiple users):', error);
    throw new Error('Invalid email or password');
  }

  // Verify password using the helper
  const isValid = await verifyPassword(password, data.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Basic check for status
  if (data.status !== 'approved' && data.role !== 'admin') {
    throw new Error('Account not approved by admin yet.');
  }

  return { user: mapUser(data) };
};

export const googleLogin = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .single();

  if (error || !data) {
    throw new Error('Google account not registered with GCare');
  }

  return { user: mapUser(data) };
};

export const resetPassword = async (email, securityAnswer, newPassword) => {
  const { error } = await supabase
    .from('users')
    .update({ password_hash: newPassword }) // Mock update
    .eq('email', email);

  if (error) throw error;
  return "Password reset successfully";
};

export const mockRegister = async (email, password, fullName, serviceLocation, latitude, longitude, securityAnswer) => {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      email,
      password_hash: password, // Mock hashing
      full_name: fullName,
      service_location: serviceLocation,
      latitude,
      longitude,
      role: 'service_member',
      status: 'pending',
      security_answer: securityAnswer
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Email already exists');
    throw error;
  }

  return { user: mapUser(data) };
};

export const getServiceMembers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'service_member')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }
  
  return data.map(mapUser);
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const updateServiceMemberStatus = async (id, status) => {
  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
};

export const getAllServiceRequests = async () => {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error || !data) {
    console.error('Error fetching Supabase data:', error);
    return [];
  }
  
  return data.map(req => ({
    id: req.id,
    customerName: req.customer_name,
    customerPhone: req.customer_phone,
    applianceType: req.appliance_type,
    location: req.location,
    description: req.description,
    status: req.status,
    createdAt: req.created_at,
    lat: req.lat,
    lng: req.lng
  }));
};

export const getJobsByLocation = async (location) => {
  // You can refine this to use Supabase filters if needed:
  // .eq('location', location)
  return getAllServiceRequests(); 
};

export const subscribeToNewRequests = (callback) => {
  const channel = supabase
    .channel('public:service_requests')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests' }, payload => {
      const req = payload.new;
      callback({
        id: req.id,
        customerName: req.customer_name,
        customerPhone: req.customer_phone,
        applianceType: req.appliance_type,
        location: req.location,
        description: req.description,
        status: req.status,
        createdAt: req.created_at,
        lat: req.lat,
        lng: req.lng
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const triggerNewRequestMock = async (request) => {
  const { data, error } = await supabase
    .from('service_requests')
    .insert([{
      customer_name: request.customerName,
      customer_phone: request.customerPhone,
      appliance_type: request.applianceType,
      location: request.location,
      description: request.description,
      status: 'open',
      lat: request.lat || request.coords?.lat,
      lng: request.lng || request.coords?.lng
    }]);
    
  if (error) console.error('Supabase Insert Error:', error);
};
