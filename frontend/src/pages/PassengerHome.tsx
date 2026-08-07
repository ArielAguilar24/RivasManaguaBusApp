import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonLabel,
  IonBadge,
  IonSelect,
  IonSelectOption,
  IonRefresher,
  IonRefresherContent,
  IonProgressBar
} from '@ionic/react';
import { logOutOutline, refreshOutline, busOutline, timeOutline, navigateOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { api } from '../services/api';
import type { Trip } from '../services/api';

const EXPRESS_BUS_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80';
const ORDINARY_BUS_IMAGE = 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80';

interface PassengerHomeProps {
  onLogout: () => void;
}

const PassengerHome: React.FC<PassengerHomeProps> = ({ onLogout }) => {
  const history = useHistory();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [origin, setOrigin] = useState<string>('Rivas');
  const [destination, setDestination] = useState<string>('Managua');
  const [busType, setBusType] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const fetchTrips = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getTrips(origin, destination);
      setTrips(data);
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [origin, destination]);

  const handleRefresh = async (event: CustomEvent) => {
    await fetchTrips(true);
    event.detail.complete();
  };

  const handleLogout = async () => {
    await api.logout();
    onLogout();
    history.replace('/login');
  };

  const filteredTrips = trips.filter(t => {
    if (busType === 'All') return true;
    return t.bus?.type.toLowerCase() === busType.toLowerCase();
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--card-background)', '--color': 'var(--ion-text-color)' }}>
          <IonTitle style={{ fontWeight: 600 }}>Horarios y Buses</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => fetchTrips()} title="Actualizar">
              <IonIcon slot="icon-only" icon={refreshOutline} />
            </IonButton>
            <IonButton onClick={handleLogout} title="Cerrar Sesión" color="danger">
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

        {/* Route Selector (Rivas - Managua) */}
        <div className="md3-card" style={{ margin: '0 0 16px 0', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: '16px' }}>Selecciona tu Ruta</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <IonLabel style={{ fontSize: '12px', color: 'gray' }}>Origen</IonLabel>
              <IonSelect 
                value={origin} 
                interface="popover" 
                onIonChange={e => {
                  const val = e.detail.value;
                  setOrigin(val);
                  setDestination(val === 'Rivas' ? 'Managua' : 'Rivas');
                }}
              >
                <IonSelectOption value="Rivas">Rivas</IonSelectOption>
                <IonSelectOption value="Managua">Managua</IonSelectOption>
              </IonSelect>
            </div>

            <div style={{ flex: '1', minWidth: '120px' }}>
              <IonLabel style={{ fontSize: '12px', color: 'gray' }}>Destino</IonLabel>
              <IonSelect 
                value={destination} 
                interface="popover" 
                onIonChange={e => {
                  const val = e.detail.value;
                  setDestination(val);
                  setOrigin(val === 'Rivas' ? 'Managua' : 'Rivas');
                }}
              >
                <IonSelectOption value="Rivas">Rivas</IonSelectOption>
                <IonSelectOption value="Managua">Managua</IonSelectOption>
              </IonSelect>
            </div>

            <div style={{ flex: '1', minWidth: '120px' }}>
              <IonLabel style={{ fontSize: '12px', color: 'gray' }}>Clase de Bus</IonLabel>
              <IonSelect 
                value={busType} 
                interface="popover" 
                onIonChange={e => setBusType(e.detail.value)}
              >
                <IonSelectOption value="All">Todos</IonSelectOption>
                <IonSelectOption value="Express">Expreso</IonSelectOption>
                <IonSelectOption value="Ordinary">Ordinario</IonSelectOption>
              </IonSelect>
            </div>
          </div>
        </div>

        {/* Timetable List */}
        <h3 style={{ margin: '16px 4px 12px 4px', fontWeight: 600, fontSize: '18px' }}>
          Horarios Disponibles ({filteredTrips.length})
        </h3>

        {!loading && filteredTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'gray' }}>
            <IonIcon icon={busOutline} style={{ fontSize: '48px', marginBottom: '8px' }} />
            <p>No se encontraron viajes para esta ruta o clase.</p>
          </div>
        ) : (
          filteredTrips.map(trip => {
            const isEnRoute = trip.status === 'EnRoute';
            const isDelayed = trip.status === 'Delayed';
            const isActive = isEnRoute || isDelayed;
            const isExpress = trip.bus?.type === 'Express';
            
            return (
              <div 
                key={trip.id} 
                className="md3-card"
                onClick={() => history.push(`/passenger/trip/${trip.id}`)}
                style={{ 
                  margin: '0 0 16px 0', 
                  padding: '0',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: isActive ? '2px solid var(--ion-color-success)' : '1px solid rgba(0,0,0,0.06)'
                }}
              >
                {/* Image Header */}
                <div style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)), url(${isExpress ? EXPRESS_BUS_IMAGE : ORDINARY_BUS_IMAGE})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  padding: '16px',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {trip.bus?.companyName || 'Cooperativa'}
                    </span>
                    <IonBadge color={
                      trip.status === 'EnRoute' ? 'success' :
                      trip.status === 'Delayed' ? 'warning' :
                      trip.status === 'Arrived' ? 'medium' :
                      trip.status === 'Cancelled' ? 'danger' : 'primary'
                    }>
                      {
                        trip.status === 'Scheduled' ? 'Programado' :
                        trip.status === 'EnRoute' ? 'En Ruta' :
                        trip.status === 'Delayed' ? 'Retrasado' :
                        trip.status === 'Arrived' ? 'Llegó' : 'Cancelado'
                      }
                    </IonBadge>
                  </div>

                  <h3 style={{ margin: '12px 0 4px 0', fontWeight: 'bold', fontSize: '20px' }}>
                    {trip.route?.origin} ➔ {trip.route?.destination}
                  </h3>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    Bus #{trip.bus?.busNumber} ({trip.bus?.plateNumber}) | Clase: {trip.bus?.type}
                  </div>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <IonIcon icon={timeOutline} style={{ marginRight: '6px', fontSize: '18px', color: 'var(--ion-color-primary)' }} />
                      {trip.route?.scheduledDeparture}
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--ion-color-secondary)', fontSize: '16px' }}>
                      C$ {trip.route?.fare.toFixed(2)}
                    </div>
                  </div>

                  {isActive && (
                    <div style={{ 
                      marginTop: '12px', 
                      background: 'var(--surface-tint)', 
                      padding: '8px 12px', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', color: 'var(--ion-color-success)', fontWeight: 'bold' }}>
                        <IonIcon icon={navigateOutline} style={{ marginRight: '4px' }} />
                        ¡Ubicación GPS activa!
                      </span>
                      <IonBadge color="success">Ver Mapa en Vivo</IonBadge>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </IonContent>
    </IonPage>
  );
};

export default PassengerHome;
