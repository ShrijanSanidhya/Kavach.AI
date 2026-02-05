import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Configure axios defaults
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    useEffect(() => {
        const checkUser = async () => {
            if (token) {
                try {
                    // Optional: Validate token with backend/profile endpoint
                    // For now, we decode or just trust local storage until 401
                    // You can add a /profile endpoint call here if needed
                    // const res = await axios.get('http://localhost:5000/api/auth/profile');
                    // setUser(res.data);

                    // Simulating user persistence from token (decoding would be better)
                    // For MVP, we presume valid if token exists, until 401 happens
                    const savedUser = JSON.parse(localStorage.getItem('user'));
                    if (savedUser) setUser(savedUser);

                } catch (error) {
                    console.error("Auth check failed", error);
                    logout();
                }
            }
            setLoading(false);
        };
        checkUser();
    }, [token]);

    const login = async (email, password) => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password,
            });
            const { token, ...userData } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

            setToken(token);
            setUser(userData);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            toast.success('Login successful!');
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
            return false;
        }
    };

    const signup = async (name, email, password) => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/register', {
                name,
                email,
                password,
            });
            const { token, ...userData } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

            setToken(token);
            setUser(userData);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            toast.success('Account created successfully!');
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Signup failed');
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
        toast.success('Logged out');
    };

    const value = {
        user,
        token,
        loading,
        login,
        signup,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
