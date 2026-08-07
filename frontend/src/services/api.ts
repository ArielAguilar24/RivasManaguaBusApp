const API_BASE = 'http://localhost:5000/api';

export interface User {
  id: number;
  username: string;
  role: 'Passenger' | 'Driver';
  fullName?: string;
  phoneNumber?: string;
}

export interface Bus {
  id: number;
  plateNumber: string;
  busNumber: string;
  driverName: string;
  companyName: string;
  capacity: number;
  type: 'Express' | 'Ordinary';
}

export interface Route {
  id: number;
  origin: string;
  destination: string;
  scheduledDeparture: string;
  fare: number;
}

export interface Trip {
  id: number;
  routeId: number;
  busId: number;
  driverId: number | null;
  status: 'Scheduled' | 'EnRoute' | 'Delayed' | 'Arrived' | 'Cancelled';
  currentLatitude: number;
  currentLongitude: number;
  lastUpdated: string;
  route?: Route;
  bus?: Bus;
}

export interface Comment {
  id: number;
  content: string;
  timestamp: string;
  username: string;
}

export interface Report {
  id: number;
  statusReport: 'Left' | 'NotLeft' | 'Delayed';
  delayMinutes: number;
  occupancy: 'Empty' | 'Medium' | 'Full';
  timestamp: string;
  username: string;
}

export interface TripDetails extends Trip {
  comments: Comment[];
  reports: Report[];
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Login fallido');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async register(username: string, password: string, role: string, fullName?: string, phoneNumber?: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, fullName, phoneNumber })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Registro fallido');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  // Routes
  async getRoutes(): Promise<Route[]> {
    const res = await fetch(`${API_BASE}/routes`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener rutas');
    return res.json();
  },

  // Trips
  async getTrips(origin?: string, destination?: string): Promise<Trip[]> {
    let url = `${API_BASE}/trips`;
    const params = new URLSearchParams();
    if (origin) params.append('origin', origin);
    if (destination) params.append('destination', destination);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener viajes');
    return res.json();
  },

  async getTripDetails(id: number): Promise<TripDetails> {
    const res = await fetch(`${API_BASE}/trips/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener detalles del viaje');
    return res.json();
  },

  // Passenger Reports
  async submitReport(id: number, statusReport: string, delayMinutes: number, occupancy: string): Promise<Report> {
    const res = await fetch(`${API_BASE}/trips/${id}/report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ statusReport, delayMinutes, occupancy })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al enviar reporte');
    }
    return res.json();
  },

  async submitComment(id: number, content: string): Promise<Comment> {
    const res = await fetch(`${API_BASE}/trips/${id}/comment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al enviar comentario');
    }
    return res.json();
  },

  // Driver Actions
  async getDriverTrips(): Promise<Trip[]> {
    const res = await fetch(`${API_BASE}/trips/driver`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener viajes del conductor');
    return res.json();
  },

  async assignTrip(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/trips/${id}/assign`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al asignar viaje');
  },

  async startTrip(id: number): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${id}/start`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al iniciar viaje');
    return res.json();
  },

  async updateStatus(id: number, status: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${id}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(status)
    });
    if (!res.ok) throw new Error('Error al actualizar estado');
    return res.json();
  },

  async updateLocation(id: number, latitude: number, longitude: number): Promise<void> {
    const res = await fetch(`${API_BASE}/trips/${id}/location`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ latitude, longitude })
    });
    if (!res.ok) throw new Error('Error al actualizar GPS');
  }
};
