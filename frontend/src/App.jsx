import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DjDashboard from './pages/DjDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RequestPage from './pages/RequestPage';
import Navigation from './components/Navigation';

function App() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

    const onLogin = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const updateUser = (updatedFields) => {
        const newUser = { ...user, ...updatedFields };
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    };

    const onLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <Router>
            <div className="app-container">
                {user && <Navigation user={user} onLogout={onLogout} />}
                <Routes>
                    <Route path="/" element={<RequestPage />} />
                    <Route path="/login" element={!user ? <Login onLogin={onLogin} /> : <Navigate to={user.roles.includes('Admin') ? '/admin' : '/dj'} />} />
                    <Route path="/dj" element={user && user.roles.includes('DJ') ? <DjDashboard user={user} updateUser={updateUser} /> : <Navigate to="/login" />} />
                    <Route path="/admin" element={user && user.roles.includes('Admin') ? <AdminDashboard /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
