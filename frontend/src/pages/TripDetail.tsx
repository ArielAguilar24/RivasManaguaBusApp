import React, { useEffect, useState, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonAlert
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { chatbubbleOutline, sendOutline, alertCircleOutline, locationOutline, statsChartOutline } from 'ionicons/icons';
import L from 'leaflet';
import { api } from '../services/api';
import type { TripDetails, Comment, Report } from '../services/api';
import { signalRService } from '../services/signalr';

// Predefined Bus Stops along the Rivas - Managua Route with coordinates
interface BusStop {
  name: string;
  lat: number;
  lng: number;
}

const BUS_STOPS: BusStop[] = [
  { name: 'Terminal de Rivas', lat: 11.4378, lng: -85.8263 },
  { name: 'Rotonda San Jorge', lat: 11.4533, lng: -85.8152 },
  { name: 'Potosí / Belén', lat: 11.5034, lng: -85.8677 },
  { name: 'Nandaime (Terminal/Parada)', lat: 11.7548, lng: -86.0543 },
  { name: 'Granada (Entrada/Catarina)', lat: 11.9056, lng: -86.0234 },
  { name: 'Masaya (Jalata/Las Flores)', lat: 11.9744, lng: -86.0942 },
  { name: 'Managua (Rotonda Ticuantepe)', lat: 12.0621, lng: -86.2081 },
  { name: 'Managua (Terminal UCA)', lat: 12.1278, lng: -86.2711 },
  { name: 'Managua (Terminal Roberto Huembes)', lat: 12.1464, lng: -86.2305 }
];

// Haversine formula to compute distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate Web Audio API beep for proximity alert
function playAlertBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.8); // 0.8 seconds duration
  } catch (err) {
    console.error('Audio alert could not be played:', err);
  }
}

const TripDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id, 10);

  const [details, setDetails] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-time comments & reports
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  
  // Submit state
  const [newComment, setNewComment] = useState('');
  const [selectedReportStatus, setSelectedReportStatus] = useState<'Left' | 'NotLeft' | 'Delayed'>('Left');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [selectedOccupancy, setSelectedOccupancy] = useState<'Empty' | 'Medium' | 'Full'>('Medium');

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Proximity Alert Config
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [alertType, setAlertType] = useState<'stop' | 'gps'>('stop');
  const [selectedStopIndex, setSelectedStopIndex] = useState<number>(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToBus, setDistanceToBus] = useState<number | null>(null);
  const [alertFired, setAlertFired] = useState(false);

  // UI status
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // 1. Initial Load of Trip data
  const loadTripDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getTripDetails(tripId);
      setDetails(data);
      setComments(data.comments || []);
      setReports(data.reports || []);
    } catch (err) {
      console.error(err);
      setToastMessage('Error al cargar detalles del viaje.');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripDetails();
  }, [tripId]);

  // 2. Initialize Map
  useEffect(() => {
    if (!loading && details && mapContainerRef.current && !mapRef.current) {
      // Map center between Rivas and Managua
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([11.75, -86.0], 9);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        busMarkerRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, [loading, details]);

  // 3. Connect to SignalR Hub
  useEffect(() => {
    const connectRealTime = async () => {
      try {
        await signalRService.startConnection();
        await signalRService.joinTrip(tripId);

        // Location listener
        signalRService.onLocationUpdate((update) => {
          if (parseInt(update.tripId) === tripId) {
            setDetails(prev => {
              if (!prev) return null;
              return {
                ...prev,
                currentLatitude: update.latitude,
                currentLongitude: update.longitude,
                status: update.status as any,
                lastUpdated: new Date().toISOString()
              };
            });
          }
        });

        // Comment listener
        signalRService.onCommentReceived((comment) => {
          setComments(prev => [comment, ...prev]);
        });

        // Report listener
        signalRService.onReportReceived((report) => {
          setReports(prev => [report, ...prev]);
        });
      } catch (err) {
        console.error('SignalR Setup failed:', err);
      }
    };

    if (!loading && details) {
      connectRealTime();
    }

    return () => {
      signalRService.leaveTrip(tripId);
      signalRService.stopConnection();
    };
  }, [loading, details, tripId]);

  // 4. Update Map Markers & Check Alert Proximity
  useEffect(() => {
    if (!mapRef.current || !details) return;

    const busLat = details.currentLatitude;
    const busLng = details.currentLongitude;

    // A. Update Bus Marker
    const busIcon = L.divIcon({
      className: 'custom-bus-marker',
      html: `
        <div style="
          background-color: var(--ion-color-success);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3.5px solid white;
          box-shadow: 0 0 10px rgba(0,0,0,0.4);
          animation: pulse 1.6s infinite;
        "></div>
        <style>
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
            70% { box-shadow: 0 0 0 12px rgba(76, 175, 80, 0); }
            100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
          }
        </style>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([busLat, busLng], { icon: busIcon })
        .addTo(mapRef.current)
        .bindPopup(`<strong>Autobús #${details.bus?.busNumber}</strong><br/>Estado: ${details.status}`)
        .openPopup();
    } else {
      busMarkerRef.current.setLatLng([busLat, busLng]);
      busMarkerRef.current.setPopupContent(`<strong>Autobús #${details.bus?.busNumber}</strong><br/>Estado: ${details.status}`);
    }

    // B. Handle User/Alert Location Marker
    if (isAlertActive && userCoords) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="
            background-color: var(--ion-color-danger);
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 8px rgba(0,0,0,0.4);
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
          .addTo(mapRef.current)
          .bindPopup('<strong>Tu Parada / Espera</strong>');
      } else {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
      }

      // Calculate Proximity
      const dist = calculateDistance(busLat, busLng, userCoords.lat, userCoords.lng);
      setDistanceToBus(dist);

      // Trigger Alert if under 5km and not fired yet
      if (dist <= 5 && !alertFired) {
        playAlertBeep();
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 300]);
        }
        setShowAlertModal(true);
        setAlertFired(true);
        setToastMessage('¡ALERTA! El autobús está a menos de 5 km.');
        setShowToast(true);
      } else if (dist > 5 && alertFired) {
        // Reset fired status if bus moves away (e.g. simulation restart)
        setAlertFired(false);
      }
    } else {
      // Remove User Marker if Alert disabled
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      setDistanceToBus(null);
    }
  }, [details, isAlertActive, userCoords, alertFired]);

  // 5. User Proximity Stop selection / Actual GPS Trigger
  const handleAlertConfigChange = () => {
    if (!isAlertActive) {
      // Turn ON alert
      if (alertType === 'stop') {
        const stop = BUS_STOPS[selectedStopIndex];
        setUserCoords({ lat: stop.lat, lng: stop.lng });
        setIsAlertActive(true);
        setAlertFired(false);
        setToastMessage(`Alerta configurada en: ${stop.name}`);
        setShowToast(true);
      } else {
        // Get actual GPS
        if (!navigator.geolocation) {
          setToastMessage('Geolocalización no soportada por el navegador.');
          setShowToast(true);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserCoords(coords);
            setIsAlertActive(true);
            setAlertFired(false);
            setToastMessage('Alerta configurada usando tu GPS real.');
            setShowToast(true);
          },
          (err) => {
            console.error(err);
            setToastMessage('No se pudo acceder a tu ubicación GPS.');
            setShowToast(true);
          }
        );
      }
    } else {
      // Turn OFF alert
      setIsAlertActive(false);
      setUserCoords(null);
      setDistanceToBus(null);
      setAlertFired(false);
      setToastMessage('Alerta de proximidad desactivada.');
      setShowToast(true);
    }
  };

  // 6. Submit Comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.submitComment(tripId, newComment);
      setNewComment('');
    } catch (err: any) {
      setToastMessage(err.message || 'Error al comentar');
      setShowToast(true);
    }
  };

  // 7. Submit crowdsourced report
  const handleSendReport = async () => {
    try {
      await api.submitReport(tripId, selectedReportStatus, delayMinutes, selectedOccupancy);
      setToastMessage('¡Reporte enviado con éxito!');
      setShowToast(true);
    } catch (err: any) {
      setToastMessage(err.message || 'Error al reportar');
      setShowToast(true);
    }
  };

  // 8. Visual Occupancy bar/average helper
  const getOccupancyStats = () => {
    if (reports.length === 0) return 'No reportado';
    const counts = { Empty: 0, Medium: 0, Full: 0 };
    reports.forEach(r => {
      if (r.occupancy === 'Empty') counts.Empty++;
      else if (r.occupancy === 'Medium') counts.Medium++;
      else if (r.occupancy === 'Full') counts.Full++;
    });

    const max = Math.max(counts.Empty, counts.Medium, counts.Full);
    if (max === counts.Empty) return 'Vacío (Reportado)';
    if (max === counts.Full) return 'Lleno (Reportado)';
    return 'Medio (Reportado)';
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ textAlign: 'center', padding: '60px 0' }}>
          <IonLabel>Cargando detalles del viaje...</IonLabel>
        </IonContent>
      </IonPage>
    );
  }

  if (!details) {
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ textAlign: 'center', padding: '60px 0' }}>
          <IonLabel>No se pudo encontrar la información de este viaje.</IonLabel>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': 'var(--card-background)' }}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/passenger/home" text="Atrás" />
          </IonButtons>
          <IonTitle style={{ fontWeight: 600 }}>Detalles del Autobús</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Route Card */}
        <div className="md3-card" style={{ margin: '0 0 16px 0', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: '0', fontWeight: 'bold', fontSize: '20px' }}>
              {details.route?.origin} ➔ {details.route?.destination}
            </h2>
            <IonBadge color={
              details.status === 'EnRoute' ? 'success' :
              details.status === 'Delayed' ? 'warning' : 'primary'
            }>
              {details.status === 'Scheduled' ? 'Programado' :
               details.status === 'EnRoute' ? 'En Ruta' :
               details.status === 'Delayed' ? 'Retrasado' :
               details.status === 'Arrived' ? 'Llegó' : 'Cancelado'}
            </IonBadge>
          </div>
          <p style={{ color: 'gray', margin: '4px 0 12px 0', fontSize: '13px' }}>
            {details.bus?.companyName} | Bus #{details.bus?.busNumber} ({details.bus?.type})
          </p>

          <IonGrid style={{ padding: '0' }}>
            <IonRow>
              <IonCol size="6" style={{ padding: '0' }}>
                <span style={{ fontSize: '12px', color: 'gray' }}>Salida Programada</span>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{details.route?.scheduledDeparture}</div>
              </IonCol>
              <IonCol size="6" style={{ padding: '0', textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'gray' }}>Precio Pasaje</span>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--ion-color-secondary)' }}>
                  C$ {details.route?.fare.toFixed(2)}
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>

        {/* Live GPS Tracker Section */}
        <div className="md3-card" style={{ margin: '0 0 16px 0', padding: '12px' }}>
          <h3 style={{ margin: '4px 4px 10px 4px', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center' }}>
            <IonIcon icon={locationOutline} style={{ marginRight: '6px', color: 'var(--ion-color-success)' }} />
            Mapa en Tiempo Real
          </h3>
          
          <div 
            ref={mapContainerRef} 
            style={{ 
              height: '240px', 
              width: '100%', 
              background: '#eaeaea',
              position: 'relative'
            }} 
          />

          <div style={{ marginTop: '8px', fontSize: '11px', color: 'gray', textAlign: 'right' }}>
            Último reporte GPS: {new Date(details.lastUpdated).toLocaleTimeString()}
          </div>
        </div>

        {/* 5KM PROXIMITY ALERT */}
        <div className="md3-card" style={{ margin: '0 0 16px 0', backgroundColor: isAlertActive ? 'rgba(63, 81, 181, 0.05)' : 'var(--card-background)' }}>
          <h3 style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center' }}>
            <IonIcon icon={alertCircleOutline} style={{ marginRight: '6px', color: 'var(--ion-color-primary)' }} />
            Alerta de Proximidad (5 km)
          </h3>

          {!isAlertActive ? (
            <div>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'gray' }}>
                Te notificaremos con un sonido cuando el autobús esté a menos de 5 km de tu parada.
              </p>

              <div style={{ marginBottom: '12px' }}>
                <IonSegment value={alertType} onIonChange={e => setAlertType(e.detail.value as 'stop' | 'gps')}>
                  <IonSegmentButton value="stop">
                    <IonLabel style={{ fontSize: '12px' }}>Parada</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="gps">
                    <IonLabel style={{ fontSize: '12px' }}>Mi GPS</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </div>

              {alertType === 'stop' && (
                <div className="md3-input-container" style={{ margin: '0 0 12px 0' }}>
                  <IonLabel style={{ fontSize: '11px', color: 'gray' }}>Selecciona tu parada:</IonLabel>
                  <IonSelect value={selectedStopIndex} interface="popover" onIonChange={e => setSelectedStopIndex(e.detail.value)}>
                    {BUS_STOPS.map((stop, index) => (
                      <IonSelectOption key={index} value={index}>{stop.name}</IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
              )}

              <IonButton expand="block" size="small" className="md3-pill-button" onClick={handleAlertConfigChange}>
                Activar Alerta
              </IonButton>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ion-color-primary)' }}>
                🚨 Alerta Activa: {alertType === 'stop' ? BUS_STOPS[selectedStopIndex].name : 'Ubicación GPS real'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>
                {distanceToBus !== null ? `${distanceToBus.toFixed(2)} km` : '-- km'}
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'gray' }}>
                Distancia en tiempo real entre el bus y tu ubicación.
              </p>
              <IonButton expand="block" size="small" color="danger" className="md3-pill-button" onClick={handleAlertConfigChange}>
                Desactivar Alerta
              </IonButton>
            </div>
          )}
        </div>

        {/* Crowdsourcing Report Tab */}
        <div className="md3-card" style={{ margin: '0 0 16px 0' }}>
          <h3 style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center' }}>
            <IonIcon icon={statsChartOutline} style={{ marginRight: '6px', color: 'var(--ion-color-secondary)' }} />
            Estado Reportado por Pasajeros
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0 16px 0', fontSize: '14px' }}>
            <div>
              <strong>Ocupación:</strong> <span style={{ color: 'var(--ion-color-secondary)', fontWeight: 'bold' }}>{getOccupancyStats()}</span>
            </div>
            <div>
              <strong>Reportes totales:</strong> {reports.length}
            </div>
          </div>

          <div style={{ background: 'var(--surface-tint)', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>¿Vienes en el bus o estás en la parada? Reporta el estado:</h4>
            
            <IonGrid style={{ padding: '0', marginBottom: '12px' }}>
              <IonRow>
                <IonCol size="6" style={{ padding: '0 4px 0 0' }}>
                  <IonLabel style={{ fontSize: '11px', color: 'gray' }}>Estado Salida</IonLabel>
                  <IonSelect value={selectedReportStatus} interface="popover" onIonChange={e => setSelectedReportStatus(e.detail.value)}>
                    <IonSelectOption value="Left">Ya salió</IonSelectOption>
                    <IonSelectOption value="NotLeft">No ha salido</IonSelectOption>
                    <IonSelectOption value="Delayed">Retrasado</IonSelectOption>
                  </IonSelect>
                </IonCol>
                <IonCol size="6" style={{ padding: '0 0 0 4px' }}>
                  <IonLabel style={{ fontSize: '11px', color: 'gray' }}>Ocupación</IonLabel>
                  <IonSelect value={selectedOccupancy} interface="popover" onIonChange={e => setSelectedOccupancy(e.detail.value)}>
                    <IonSelectOption value="Empty">Vacío (Asientos diponibles)</IonSelectOption>
                    <IonSelectOption value="Medium">Medio (Solo parados)</IonSelectOption>
                    <IonSelectOption value="Full">Lleno (Límite)</IonSelectOption>
                  </IonSelect>
                </IonCol>
              </IonRow>

              {selectedReportStatus === 'Delayed' && (
                <IonRow style={{ marginTop: '8px' }}>
                  <IonCol size="12" style={{ padding: '0' }}>
                    <div className="md3-input-container" style={{ margin: '0' }}>
                      <IonInput
                        type="number"
                        label="Minutos de retraso"
                        labelPlacement="floating"
                        value={delayMinutes}
                        onIonInput={e => setDelayMinutes(parseInt(e.detail.value || '0', 10))}
                      />
                    </div>
                  </IonCol>
                </IonRow>
              )}
            </IonGrid>

            <IonButton expand="block" size="small" color="secondary" className="md3-pill-button" onClick={handleSendReport}>
              Enviar Reporte Colectivo
            </IonButton>
          </div>
        </div>

        {/* Real-time Comments Section */}
        <div className="md3-card" style={{ margin: '0 0 16px 0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center' }}>
            <IonIcon icon={chatbubbleOutline} style={{ marginRight: '6px', color: 'var(--ion-color-primary)' }} />
            Comentarios en Vivo ({comments.length})
          </h3>

          <form onSubmit={handleSendComment} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div className="md3-input-container" style={{ flex: '1', margin: '0', padding: '4px 12px' }}>
              <IonInput
                placeholder="Añade un comentario sobre la ruta..."
                value={newComment}
                onIonInput={e => setNewComment(e.detail.value || '')}
              />
            </div>
            <IonButton type="submit" style={{ margin: '0' }} className="md3-pill-button">
              <IonIcon icon={sendOutline} />
            </IonButton>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'gray', fontSize: '13px' }}>
                Aún no hay comentarios. ¡Sé el primero en comentar!
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                    <span>{c.username}</span>
                    <span style={{ fontWeight: 'normal', color: 'gray' }}>
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px', color: 'var(--ion-text-color)' }}>{c.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5KM proximity Alert Modal Dialog */}
        <IonAlert
          isOpen={showAlertModal}
          onDidDismiss={() => setShowAlertModal(false)}
          header="🚨 Bus Cerca"
          subHeader="Distancia menor a 5 KM"
          message={`El autobús de ${details.bus?.companyName} se encuentra a menos de 5 km de tu ubicación de espera. ¡Prepárate para abordar!`}
          buttons={['Aceptar']}
        />

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

export default TripDetail;
