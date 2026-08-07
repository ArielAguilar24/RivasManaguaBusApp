import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonButton,
  IonInput,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonToast
} from '@ionic/react';
import { api } from '../services/api';

interface LoginProps {
  onLoginSuccess: (role: 'Passenger' | 'Driver') => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'Passenger' | 'Driver'>('Passenger');
  
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setToastMessage('Por favor completa todos los campos.');
      setShowToast(true);
      return;
    }

    if (!isLogin && role === 'Driver' && (!fullName.trim() || !phoneNumber.trim())) {
      setToastMessage('Nombre completo y número de teléfono son obligatorios para conductores.');
      setShowToast(true);
      return;
    }

    try {
      if (isLogin) {
        const data = await api.login(username, password);
        setToastMessage(`¡Bienvenido de vuelta, ${data.user.fullName || data.user.username}!`);
        setShowToast(true);
        onLoginSuccess(data.user.role);
      } else {
        const data = await api.register(username, password, role, fullName, phoneNumber);
        setToastMessage(`¡Registro exitoso! Bienvenido ${data.user.fullName || data.user.username}.`);
        setShowToast(true);
        onLoginSuccess(data.user.role);
      }
    } catch (err: any) {
      setToastMessage(err.message || 'Ocurrió un error');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ '--background': 'var(--ion-background-color)' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100%',
          maxWidth: '420px',
          margin: '0 auto'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontWeight: 700, margin: '0', color: 'var(--ion-color-primary)', fontSize: '28px' }}>
              Rivas-Managua Bus
            </h1>
            <p style={{ margin: '8px 0 0 0', color: 'gray', fontSize: '14px' }}>
              Horarios, ubicación en tiempo real y reportes colectivos
            </p>
          </div>

          <div className="md3-card" style={{ width: '100%', padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <IonSegment value={isLogin ? 'login' : 'register'} onIonChange={(e) => setIsLogin(e.detail.value === 'login')}>
                <IonSegmentButton value="login">
                  <IonLabel>Iniciar Sesión</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="register">
                  <IonLabel>Registrarse</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="md3-input-container">
                <IonInput
                  label="Usuario"
                  labelPlacement="floating"
                  placeholder="Introduce tu usuario"
                  value={username}
                  onIonInput={(e) => setUsername(e.detail.value || '')}
                  required
                />
              </div>

              <div className="md3-input-container">
                <IonInput
                  type="password"
                  label="Contraseña"
                  labelPlacement="floating"
                  placeholder="Introduce tu contraseña"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value || '')}
                  required
                />
              </div>

              {!isLogin && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <IonLabel style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'gray' }}>
                      Rol de cuenta:
                    </IonLabel>
                    <IonSegment value={role} onIonChange={(e) => setRole(e.detail.value as 'Passenger' | 'Driver')}>
                      <IonSegmentButton value="Passenger">
                        <IonLabel>Pasajero</IonLabel>
                      </IonSegmentButton>
                      <IonSegmentButton value="Driver">
                        <IonLabel>Conductor</IonLabel>
                      </IonSegmentButton>
                    </IonSegment>
                  </div>

                  {role === 'Driver' && (
                    <>
                      <div className="md3-input-container">
                        <IonInput
                          label="Nombre Completo (Conductor)"
                          labelPlacement="floating"
                          placeholder="Ej: Don Carlos Mendoza"
                          value={fullName}
                          onIonInput={(e) => setFullName(e.detail.value || '')}
                          required
                        />
                      </div>

                      <div className="md3-input-container">
                        <IonInput
                          type="tel"
                          label="Número de Teléfono Personal"
                          labelPlacement="floating"
                          placeholder="Ej: +505 8888 9999"
                          value={phoneNumber}
                          onIonInput={(e) => setPhoneNumber(e.detail.value || '')}
                          required
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <IonButton
                type="submit"
                expand="block"
                className="md3-pill-button"
                style={{ marginTop: '24px', '--background': 'var(--ion-color-primary)' }}
              >
                {isLogin ? 'Entrar' : 'Registrar Cuenta'}
              </IonButton>
            </form>
          </div>

          <div style={{ marginTop: '16px', fontSize: '12px', color: 'gray', textAlign: 'center' }}>
            Conéctate para ver el estado de los buses y reportar incidencias.
          </div>
        </div>

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

export default Login;
