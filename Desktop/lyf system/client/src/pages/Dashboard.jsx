import { useUser, useAuth } from '@clerk/clerk-react';

const Dashboard = () => {
    const { user } = useUser();
    const { getToken } = useAuth();

    const handleTestApi = async () => {
        try {
            const token = await getToken();
            // Updated port to 5001 as per previous fix
            const res = await fetch('http://localhost:5001/api/auth/profile', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            alert(JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(error);
            alert('Error calling API');
        }
    };

    if (!user) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                </div>
            </header>
            <main>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                            <div className="px-4 py-5 sm:px-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
                                <p className="mt-1 max-w-2xl text-sm text-gray-500">Details from Clerk Authentication.</p>
                            </div>
                            <div className="border-t border-gray-200">
                                <dl>
                                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">Full name</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.fullName}</dd>
                                    </div>
                                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">Email address</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.primaryEmailAddress?.emailAddress}</dd>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">User ID</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">{user.id}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        <button
                            onClick={handleTestApi}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Test Backend API Protection
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
