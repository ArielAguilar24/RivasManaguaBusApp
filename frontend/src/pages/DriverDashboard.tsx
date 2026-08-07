import React, { useEffect, useState, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonBadge,
  IonToast,
  IonSpinner,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent
} from '@ionic/react';
import { logOutOutline, refreshOutline, playOutline, navigateOutline, stopOutline, busOutline, personOutline, timeOutline, checkmarkDoneOutline, alertCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import L from 'leaflet';
import { api } from '../services/api';
import type { Trip } from '../services/api';

// Images for Express and Ordinary Buses
const EXPRESS_BUS_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80';
const ORDINARY_BUS_IMAGE = 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80';

// Pre-computed highway GPS points connecting Rivas Terminal and Managua Roberto Huembes Terminal
const SIMULATION_ROUTE_COORDS = [
  { lat: 11.4378, lng: -85.8263 }, // 1. Rivas Terminal
  { lat: 11.4533, lng: -85.8152 }, // 2. Rotonda San Jorge
  { lat: 11.5034, lng: -85.8677 }, // 3. Belén Junction
  { lat: 11.5840, lng: -85.9380 }, // 4. Ochomogo Bridge
  { lat: 11.6650, lng: -85.9960 }, // 5. Las Flores Junction
  { lat: 11.7548, lng: -86.0543 }, // 6. Nandaime Junction
  { lat: 11.8320, lng: -86.0790 }, // 7. Diriomo entrance
  { lat: 11.9120, lng: -86.0530 }, // 8. Catarina entrance
  { lat: 11.9744, lng: -86.0942 }, // 9. Masaya Las Flores
  { lat: 12.0621, lng: -86.2081 }, // 10. Ticuantepe Rotonda
  { lat: 12.1278, lng: -86.2711 }, // 11. UCA Junction
  { lat: 12.1464, lng: -86.2305 }  // 12. Managua Huembes Terminal
];

const DriverDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const history = useHistory();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTripId, setActionTripId] = useState<number | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const simIntervalRef = useRef<any>(null);

  // Real GPS watch state
  const [watchId, setWatchId] = useState<number | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // 1. Fetch trips for Driver Panel
  const fetchTrips = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getDriverTrips();
      setTrips(data);
      
      const active = data.find(t => t.status === 'EnRoute' || t.status === 'Delayed');
      if (active) {
        setActiveTrip(active);
      } else {
        setActiveTrip(null);
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Error al obtener viajes del servidor.');
      setShowToast(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // 2. Initialize map when a trip becomes active
  useEffect(() => {
    if (activeTrip && mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true
      }).setView([activeTrip.currentLatitude, activeTrip.currentLongitude], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapRef.current);
    }

    return () => {
      if (!activeTrip && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [activeTrip]);

  // 3. Update map marker when coordinates change
  useEffect(() => {
    if (!mapRef.current || !activeTrip) return;

    const lat = activeTrip.currentLatitude;
    const lng = activeTrip.currentLongitude;

    const busIcon = L.divIcon({
      className: 'driver-bus-marker',
      html: `<div style="
        background-color: var(--ion-color-primary);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3.5px solid white;
        box-shadow: 0 0 10px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: busIcon }).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    mapRef.current.panTo([lat, lng]);
  }, [activeTrip]);

  // Clean up timers/watchers on unmount
  useEffect(() => {
    return () => {
      stopSimulation();
      stopRealGpsWatch();
    };
  }, []);

  const handleRefresh = async (event: CustomEvent) => {
    await fetchTrips(true);
    event.detail.complete();
  };

  const handleLogout = async () => {
    stopSimulation();
    stopRealGpsWatch();
    await api.logout();
    onLogout();
    history.replace('/login');
  };

  // Driver action: Self-assign a scheduled trip
  const handleAssignTrip = async (id: number) => {
    try {
      setActionTripId(id);
      await api.assignTrip(id);
      setToastMessage('¡Viaje asignado correctamente!');
      setShowToast(true);
      await fetchTrips(true);
    } catch (err: any) {
      setToastMessage(err.message || 'Error al asignar viaje');
      setShowToast(true);
    } finally {
      setActionTripId(null);
    }
  };

  // Driver action: Start trip
  const handleStartTrip = async (id: number) => {
    try {
      setActionTripId(id);
      const trip = await api.startTrip(id);
      setActiveTrip(trip);
      setToastMessage('¡Viaje iniciado! El GPS está activo.');
      setShowToast(true);
      await fetchTrips(true);
    } catch (err: any) {
      setToastMessage(err.message || 'Error al iniciar viaje');
      setShowToast(true);
    } finally {
      setActionTripId(null);
    }
  };

  // Driver action: Change status (Delayed / Arrived / Cancelled)
  const handleUpdateStatus = async (status: string) => {
    if (!activeTrip) return;
    try {
      setActionTripId(activeTrip.id);
      const updated = await api.updateStatus(activeTrip.id, status);
      setActiveTrip(updated);
      setToastMessage(`Estado actualizado: ${status}`);
      setShowToast(true);
      
      if (status === 'Arrived' || status === 'Cancelled') {
        stopSimulation();
        stopRealGpsWatch();
        setActiveTrip(null);
      }
      await fetchTrips(true);
    } catch (err: any) {
      setToastMessage(err.message || 'Error al actualizar estado');
      setShowToast(true);
    } finally {
      setActionTripId(null);
    }
  };

  // --- Real-world GPS Watcher ---
  const startRealGpsWatch = () => {
    if (isSimulating) stopSimulation();
    if (watchId !== null) return;

    if (!navigator.geolocation) {
      setToastMessage('Geolocalización no soportada en este dispositivo.');
      setShowToast(true);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (activeTrip) {
          try {
            await api.updateLocation(activeTrip.id, latitude, longitude);
            setActiveTrip(prev => prev ? { ...prev, currentLatitude: latitude, currentLongitude: longitude } : null);
          } catch (e) {
            console.error('Error sending GPS update:', e);
          }
        }
      },
      (err) => {
        console.error('GPS Watch error:', err);
        setToastMessage('Error leyendo GPS del dispositivo.');
        setShowToast(true);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    setWatchId(id);
    setToastMessage('GPS Real del dispositivo Activado.');
    setShowToast(true);
  };

  const stopRealGpsWatch = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setToastMessage('GPS Real del dispositivo Desactivado.');
      setShowToast(true);
    }
  };

  // --- Mock highway GPS Simulation ---
  const startSimulation = () => {
    stopRealGpsWatch();
    if (isSimulating || !activeTrip) return;

    const isManaguaToRivas = activeTrip.route?.origin.toLowerCase() === 'managua';
    const coords = isManaguaToRivas 
      ? [...SIMULATION_ROUTE_COORDS].reverse() 
      : SIMULATION_ROUTE_COORDS;

    let index = 0;
    setIsSimulating(true);
    setToastMessage('Simulación de ruta iniciada.');
    setShowToast(true);

    simIntervalRef.current = setInterval(async () => {
      index++;
      if (index >= coords.length) {
        clearInterval(simIntervalRef.current!);
        setIsSimulating(false);
        setToastMessage('La simulación ha llegado a su destino.');
        setShowToast(true);
        handleUpdateStatus('Arrived');
        return;
      }

      const point = coords[index];
      api.updateLocation(activeTrip.id, point.lat, point.lng).then(() => {
        setActiveTrip(prev => prev ? { ...prev, currentLatitude: point.lat, currentLongitude: point.lng } : null);
      }).catch(err => console.error(err));
    }, 4000);
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
      setIsSimulating(false);
      setToastMessage('Simulación detenida.');
      setShowToast(true);
    }
  };

  const currentUser = api.getCurrentUser();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--card-background)' }}>
          <IonTitle style={{ fontWeight: 600 }}>Panel Conductor</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => fetchTrips()}>
              <IonIcon slot="icon-only" icon={refreshOutline} />
            </IonButton>
            <IonButton onClick={handleLogout} color="danger">
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {loading && <IonProgressBar type="indeterminate" color="primary" />}
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Driver Info Banner */}
        <div className="md3-card" style={{ margin: '0 0 16px 0', padding: '16px', background: 'var(--surface-tint)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--ion-color-primary)', color: 'white', borderRadius: '50%', padding: '10px' }}>
              <IonIcon icon={personOutline} style={{ fontSize: '20px', display: 'block' }} />
            </div>
            <div>
              <h3 style={{ margin: '0', fontWeight: 'bold', fontSize: '16px' }}>
                {currentUser?.fullName || currentUser?.username || 'Conductor'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'gray' }}>
                Teléfono: {currentUser?.phoneNumber || 'No especificado'} | Rol: Conductor Registrado
              </p>
            </div>
          </div>
        </div>

        {/* 1. Active Trip Deck */}
        {activeTrip ? (
          <div className="md3-card" style={{ margin: '0 0 16px 0', padding: '0', overflow: 'hidden', border: '2px solid var(--ion-color-primary)' }}>
            <div style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url(${activeTrip.bus?.type === 'Express' ? EXPRESS_BUS_IMAGE : ORDINARY_BUS_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              padding: '16px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IonBadge color="success">Viaje en Curso</IonBadge>
                <span style={{ fontSize: '12px', fontWeight: '500' }}>{activeTrip.bus?.companyName}</span>
              </div>
              <h2 style={{ margin: '8px 0 4px 0', fontWeight: 'bold', fontSize: '22px' }}>
                {activeTrip.route?.origin} ➔ {activeTrip.route?.destination}
              </h2>
              <p style={{ margin: '0', fontSize: '13px', opacity: 0.9 }}>
                Bus #{activeTrip.bus?.busNumber} ({activeTrip.bus?.plateNumber}) | Salida: {activeTrip.route?.scheduledDeparture}
              </p>
            </div>

            <div style={{ padding: '16px' }}>
              {/* GPS Map Container */}
              <div ref={mapContainerRef} style={{ height: '220px', width: '100%', borderRadius: '12px', marginBottom: '16px' }} />

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {!isSimulating ? (
                  <IonButton size="small" onClick={startSimulation} className="md3-pill-button">
                    <IonIcon icon={playOutline} slot="start" /> Simular Ruta GPS
                  </IonButton>
                ) : (
                  <IonButton size="small" color="warning" onClick={stopSimulation} className="md3-pill-button">
                    <IonIcon icon={stopOutline} slot="start" /> Pausar Simulación
                  </IonButton>
                )}

                {watchId === null ? (
                  <IonButton size="small" color="secondary" onClick={startRealGpsWatch} className="md3-pill-button">
                    <IonIcon icon={navigateOutline} slot="start" /> Usar GPS Real
                  </IonButton>
                ) : (
                  <IonButton size="small" color="danger" onClick={stopRealGpsWatch} className="md3-pill-button">
                    <IonIcon icon={stopOutline} slot="start" /> Detener GPS Real
                  </IonButton>
                )}
              </div>

              {/* Status Update Buttons */}
              <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Actualizar Estado del Autobús:</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <IonButton size="small" color="primary" disabled={actionTripId === activeTrip.id} onClick={() => handleUpdateStatus('EnRoute')} className="md3-pill-button">
                  En Ruta
                </IonButton>
                <IonButton size="small" color="warning" disabled={actionTripId === activeTrip.id} onClick={() => handleUpdateStatus('Delayed')} className="md3-pill-button">
                  <IonIcon icon={alertCircleOutline} slot="start" /> Retrasado
                </IonButton>
                <IonButton size="small" color="success" disabled={actionTripId === activeTrip.id} onClick={() => handleUpdateStatus('Arrived')} className="md3-pill-button">
                  <IonIcon icon={checkmarkDoneOutline} slot="start" /> Llegó a Destino
                </IonButton>
                <IonButton size="small" color="danger" disabled={actionTripId === activeTrip.id} onClick={() => handleUpdateStatus('Cancelled')} className="md3-pill-button">
                  Cancelar
                </IonButton>
              </div>
            </div>
          </div>
        ) : (
          /* 2. Scheduled Trip List */
          <div>
            <h3 style={{ margin: '0 4px 12px 4px', fontWeight: 600, fontSize: '18px' }}>
              Viajes Disponibles / Programados
            </h3>
            
            {!loading && trips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'gray' }}>
                <IonIcon icon={busOutline} style={{ fontSize: '48px', marginBottom: '8px' }} />
                <p>No hay viajes programados disponibles en este momento.</p>
              </div>
            ) : (
              trips.map(trip => {
                const isAssignedToMe = trip.driverId !== null;
                const isExpress = trip.bus?.type === 'Express';
                const isBusy = actionTripId === trip.id;
                
                return (
                  <div key={trip.id} className="md3-card" style={{ margin: '0 0 16px 0', padding: '0', overflow: 'hidden' }}>
                    {/* Bus Image Header */}
                    <div style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.75)), url(${isExpress ? EXPRESS_BUS_IMAGE : ORDINARY_BUS_IMAGE})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      padding: '16px',
                      color: 'white'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <IonBadge color={isAssignedToMe ? 'primary' : 'medium'}>
                          {isAssignedToMe ? 'Asignado a ti' : 'Sin Conductor'}
                        </IonBadge>
                        <IonBadge color={isExpress ? 'tertiary' : 'secondary'}>
                          {trip.bus?.type}
                        </IonBadge>
                      </div>

                      <h3 style={{ margin: '12px 0 4px 0', fontWeight: 'bold', fontSize: '20px' }}>
                        {trip.route?.origin} ➔ {trip.route?.destination}
                      </h3>
                      <div style={{ fontSize: '13px', opacity: 0.9 }}>
                        {trip.bus?.companyName} | Bus #{trip.bus?.busNumber} ({trip.bus?.plateNumber})
                      </div>
                    </div>

                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--ion-text-color)' }}>
                          <IonIcon icon={timeOutline} style={{ marginRight: '4px', fontSize: '16px' }} />
                          Salida: <strong>{trip.route?.scheduledDeparture}</strong>
                        </span>
                        <span style={{ fontWeight: 'bold', color: 'var(--ion-color-secondary)', fontSize: '15px' }}>
                          C$ {trip.route?.fare.toFixed(2)}
                        </span>
                      </div>

                      {!isAssignedToMe ? (
                        <IonButton 
                          expand="block" 
                          size="small" 
                          color="secondary" 
                          disabled={isBusy}
                          onClick={() => handleAssignTrip(trip.id)} 
                          className="md3-pill-button"
                        >
                          {isBusy ? <IonSpinner name="crescent" /> : 'Asignarme como Conductor'}
                        </IonButton>
                      ) : (
                        <IonButton 
                          expand="block" 
                          size="small" 
                          color="primary" 
                          disabled={isBusy}
                          onClick={() => handleStartTrip(trip.id)} 
                          className="md3-pill-button"
                        >
                          {isBusy ? <IonSpinner name="crescent" /> : 'Iniciar GPS del Viaje'}
                        </IonButton>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default DriverDashboard;
