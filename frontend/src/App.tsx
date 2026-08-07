import React, { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Login from './pages/Login';
import PassengerHome from './pages/PassengerHome';
import TripDetail from './pages/TripDetail';
import DriverDashboard from './pages/DriverDashboard';
import { api } from './services/api';
import type { User } from './services/api';

const IonReactRouterEl = IonReactRouter as any;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkAuth = async () => {
    try {
      const user = api.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (e) {
      console.error('Auth verification failed', e);
      api.logout();
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    const user = api.getCurrentUser();
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (checkingAuth) {
    return null; // Or a simple skeleton loading screen
  }

  return (
    <IonApp>
      <IonReactRouterEl>
        <IonRouterOutlet>
          
          <Route exact path="/login">
            {currentUser ? (
              currentUser.role === 'Driver' ? <Redirect to="/driver" /> : <Redirect to="/passenger/home" />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )}
          </Route>

          <Route exact path="/passenger/home">
            {currentUser && currentUser.role === 'Passenger' ? (
              <PassengerHome onLogout={handleLogout} />
            ) : (
              <Redirect to="/login" />
            )}
          </Route>

          <Route exact path="/passenger/trip/:id">
            {currentUser && currentUser.role === 'Passenger' ? (
              <TripDetail />
            ) : (
              <Redirect to="/login" />
            )}
          </Route>

          <Route exact path="/driver">
            {currentUser && currentUser.role === 'Driver' ? (
              <DriverDashboard onLogout={handleLogout} />
            ) : (
              <Redirect to="/login" />
            )}
          </Route>

          <Route exact path="/">
            {currentUser ? (
              currentUser.role === 'Driver' ? <Redirect to="/driver" /> : <Redirect to="/passenger/home" />
            ) : (
              <Redirect to="/login" />
            )}
          </Route>

        </IonRouterOutlet>
      </IonReactRouterEl>
    </IonApp>
  );
};

export default App;
