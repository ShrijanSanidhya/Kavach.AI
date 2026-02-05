import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <button
                        onClick={logout}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>
            <main>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex flex-col items-center justify-center">
                            <h2 className="text-2xl font-semibold text-gray-700">Welcome, {user?.name}!</h2>
                            <p className="mt-2 text-gray-500">This is a protected route. Only authenticated users can see this.</p>
                            <div className="mt-4 p-4 bg-gray-50 rounded-md text-left">
                                <p className="text-sm font-mono text-gray-600">User ID: {user?._id}</p>
                                <p className="text-sm font-mono text-gray-600">Email: {user?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
